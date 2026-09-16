import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../src/generated/prisma/enums.js';
import {
  GoogleIdentityVerifier,
  type GoogleIdentity,
} from '../src/auth/google-identity.verifier.js';
import { createTestApp, resetDatabase, type TestApp } from './app.js';

class FakeGoogleVerifier {
  configured = true;
  identities = new Map<string, GoogleIdentity>();
  isConfigured(): boolean {
    return this.configured;
  }
  async verify(idToken: string): Promise<GoogleIdentity> {
    const identity = this.identities.get(idToken);
    if (!identity) throw new Error('invalid');
    return identity;
  }
}

const identity = (overrides: Partial<GoogleIdentity> = {}): GoogleIdentity => ({
  sub: 'google-sub-1',
  email: 'ana@example.com',
  emailVerified: true,
  name: 'Ana',
  picture: null,
  ...overrides,
});

describe('POST /auth/google', () => {
  let ctx: TestApp;
  let google: FakeGoogleVerifier;

  beforeAll(async () => {
    google = new FakeGoogleVerifier();
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(GoogleIdentityVerifier).useValue(google),
    );
  });
  beforeEach(async () => {
    google.configured = true;
    google.identities.clear();
    await resetDatabase(ctx.prisma);
  });
  afterAll(async () => ctx.app.close());

  async function login(token = 'ok') {
    return request(ctx.app.getHttpServer()).post('/auth/google').send({ idToken: token });
  }

  it('informa cuando Google no está configurado', async () => {
    google.configured = false;
    expect((await login()).status).toBe(503);
    expect((await login()).body.code).toBe('GOOGLE_AUTH_NOT_CONFIGURED');
  });

  it('rechaza tokens inválidos y correos no verificados sin crear usuarios', async () => {
    expect((await login('bad')).body.code).toBe('INVALID_GOOGLE_TOKEN');
    google.identities.set('unverified', identity({ emailVerified: false }));
    expect((await login('unverified')).body.code).toBe('INVALID_GOOGLE_TOKEN');
    expect(await ctx.prisma.user.count()).toBe(0);
  });

  it('crea y reutiliza la cuenta Google del mismo sub', async () => {
    google.identities.set('one', identity());
    const first = await login('one');
    const second = await login('one');
    expect(first.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(first.body.user.providers).toEqual(['GOOGLE']);
    expect(await ctx.prisma.user.count()).toBe(1);
    expect(await ctx.prisma.authAccount.count()).toBe(1);
    expect((await ctx.prisma.user.findFirstOrThrow()).emailVerifiedAt).not.toBeNull();
  });

  it('sustituye una cuenta local no verificada del mismo correo', async () => {
    const local = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'ana@example.com', password: 'password123', name: 'Ana' });
    google.identities.set('google', identity());
    const linked = await login('google');
    expect(linked.body.user.id).toBe(local.body.user.id);
    expect(
      await ctx.prisma.authAccount.findFirst({ where: { provider: AuthProvider.LOCAL } }),
    ).toBeNull();
    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: local.body.tokens.refreshToken })
      .expect(401);
    await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: 'password123' })
      .expect(401);
  });

  it('rechaza otro sub para un correo ya vinculado y normaliza el correo', async () => {
    google.identities.set('one', identity({ email: 'ANA@EXAMPLE.COM' }));
    const first = await login('one');
    google.identities.set('two', identity({ sub: 'google-sub-2' }));
    expect((await login('two')).body.code).toBe('INVALID_GOOGLE_TOKEN');
    expect(first.body.user.email).toBe('ana@example.com');
    expect(await ctx.prisma.authAccount.count({ where: { provider: AuthProvider.GOOGLE } })).toBe(
      1,
    );
  });
});
