import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';
import { ApiException } from '../common/api-exception.filter.js';
import type { Env } from '../common/config/env.js';
import type { User as UserRow } from '../generated/prisma/client.js';
import { AuthProvider } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthResponse, UserResponse } from './dto/auth-responses.dto.js';
import { type GoogleIdentity, GoogleIdentityVerifier } from './google-identity.verifier.js';

// Hash argon2id de una contraseña aleatoria. Se verifica contra él cuando el usuario no
// existe para que el tiempo de respuesta no revele qué correos están registrados.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$z3vWdl/K2WOmiQz/k+APpC9xpkISpVIKkgoeHYFieGQ';

const REFRESH_TOKEN_BYTES = 32;
const DAY_MS = 24 * 60 * 60 * 1000;

const invalidCredentials = () =>
  new ApiException(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
const invalidRefreshToken = () =>
  new ApiException(401, 'INVALID_REFRESH_TOKEN', 'La sesión no es válida o expiró');
const invalidGoogleToken = () =>
  new ApiException(401, 'INVALID_GOOGLE_TOKEN', 'No fue posible verificar la cuenta de Google');

type UserWithAccounts = UserRow & { accounts: { provider: AuthProvider }[] };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly google: GoogleIdentityVerifier,
  ) {}

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiException(409, 'EMAIL_ALREADY_REGISTERED', 'Ese correo ya está registrado');
    }

    const passwordHash = await hash(password, { algorithm: 2 /* Argon2id */ });
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        // En cuentas LOCAL el identificador ante el "proveedor" es el correo normalizado.
        accounts: {
          create: { provider: AuthProvider.LOCAL, providerAccountId: email, passwordHash },
        },
      },
    });
    return this.issueSession(user.id);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { accounts: { where: { provider: AuthProvider.LOCAL } } },
    });
    const passwordHash = user?.accounts[0]?.passwordHash ?? null;

    // Siempre se ejecuta una verificación argon2 para igualar tiempos.
    const matches = await verify(passwordHash ?? DUMMY_PASSWORD_HASH, password).catch(() => false);
    if (!user || !passwordHash || !matches) throw invalidCredentials();

    return this.issueSession(user.id);
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    if (!this.google.isConfigured()) {
      throw new ApiException(
        503,
        'GOOGLE_AUTH_NOT_CONFIGURED',
        'El inicio de sesión con Google no está configurado',
      );
    }

    let identity: GoogleIdentity;
    try {
      identity = await this.google.verify(idToken);
    } catch {
      throw invalidGoogleToken();
    }
    const userId = await this.resolveGoogleUser(identity);
    return this.issueSession(userId);
  }

  /**
   * Encuentra, vincula o crea el usuario de GarFit para una identidad de Google.
   *
   * 1. Si la cuenta de Google ya está vinculada, se usa su usuario.
   * 2. Si existe un usuario con el mismo correo, se le vincula Google (nunca se duplica).
   *    Si ese usuario tenía una contraseña local sin correo verificado, se elimina y se
   *    revocan sus sesiones: quien la creó nunca demostró ser dueño del correo y Google sí.
   *    Así se evita que alguien registre un correo ajeno y conserve acceso a la cuenta.
   * 3. Si no, se crea un usuario nuevo con el correo ya verificado.
   */
  async resolveGoogleUser(identity: GoogleIdentity): Promise<string> {
    if (!identity.emailVerified) throw invalidGoogleToken();
    const email = identity.email.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      const linked = await tx.authAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: AuthProvider.GOOGLE,
            providerAccountId: identity.sub,
          },
        },
      });
      if (linked) return linked.userId;

      const existing = await tx.user.findUnique({ where: { email }, include: { accounts: true } });
      if (existing) {
        if (existing.accounts.some((account) => account.provider === AuthProvider.GOOGLE)) {
          // El correo ya está vinculado a OTRA cuenta de Google (sub distinto).
          throw invalidGoogleToken();
        }
        if (!existing.emailVerifiedAt) {
          await tx.authAccount.deleteMany({
            where: { userId: existing.id, provider: AuthProvider.LOCAL },
          });
          await tx.session.updateMany({
            where: { userId: existing.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        await tx.user.update({
          where: { id: existing.id },
          data: {
            emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            avatarUrl: existing.avatarUrl ?? identity.picture,
            accounts: {
              create: { provider: AuthProvider.GOOGLE, providerAccountId: identity.sub },
            },
          },
        });
        return existing.id;
      }

      const created = await tx.user.create({
        data: {
          email,
          name: identity.name,
          avatarUrl: identity.picture,
          emailVerifiedAt: new Date(),
          accounts: { create: { provider: AuthProvider.GOOGLE, providerAccountId: identity.sub } },
        },
      });
      return created.id;
    });
  }

  /**
   * Rota el refresh token: la sesión usada se revoca y se emite una nueva. Presentar un token
   * ya revocado indica robo o reutilización, así que se revocan todas las sesiones del usuario.
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashToken(refreshToken) },
    });
    if (!session) throw invalidRefreshToken();

    if (session.revokedAt) {
      await this.revokeAllSessions(session.userId);
      throw invalidRefreshToken();
    }
    if (session.expiresAt <= new Date()) throw invalidRefreshToken();

    // Revocación condicional: si dos peticiones usan el mismo token a la vez, sólo una gana.
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      await this.revokeAllSessions(session.userId);
      throw invalidRefreshToken();
    }
    return this.issueSession(session.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: { select: { provider: true } } },
    });
    // Un JWT válido de un usuario borrado se trata como no autenticado.
    if (!user) throw new ApiException(401, 'UNAUTHORIZED', 'Sesión no válida');
    return toUserResponse(user);
  }

  private async issueSession(userId: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { accounts: { select: { provider: true } } },
    });

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    const refreshTokenExpiresAt = new Date(Date.now() + ttlDays * DAY_MS);
    await this.prisma.session.create({
      data: { userId, refreshTokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt },
    });

    const accessTokenExpiresIn = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { expiresIn: accessTokenExpiresIn, algorithm: 'HS256' },
    );

    return {
      user: toUserResponse(user),
      tokens: {
        accessToken,
        accessTokenExpiresIn,
        refreshToken,
        refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      },
    };
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

/** En BD sólo se guarda el SHA-256: una fuga de la tabla no permite usar las sesiones. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toUserResponse(user: UserWithAccounts): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    providers: user.accounts.map((account) => account.provider),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
