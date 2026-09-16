import { createHash } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';

const credentials = { email: 'ANA@Example.com', password: 'password123', name: 'Ana' };
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

describe('autenticación local', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => resetDatabase(ctx.prisma));
  afterAll(async () => ctx.app.close());

  async function register() {
    return request(ctx.app.getHttpServer()).post('/auth/register').send(credentials).expect(201);
  }

  it('registra el usuario normalizado y devuelve tokens seguros', async () => {
    const response = await register();
    expect(response.body.user).toMatchObject({ email: 'ana@example.com', providers: ['LOCAL'] });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.tokens.accessTokenExpiresIn).toEqual(expect.any(Number));
    const account = await ctx.prisma.authAccount.findFirstOrThrow();
    expect(account.passwordHash).toMatch(/^\$argon2id\$/);
    expect(account.passwordHash).not.toContain(credentials.password);
  });

  it('rechaza registrar el mismo correo con distinta capitalización', async () => {
    await register();
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ ...credentials, email: 'ana@example.com' })
      .expect(409);
    expect(response.body.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('valida contraseña, correo y campos extra al registrar', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'no-es-correo', password: 'corta', name: 'Ana', extra: true })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED', details: expect.any(Array) });
  });

  it('inicia sesión con credenciales correctas y oculta el motivo de fallo', async () => {
    await register();
    const success = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: credentials.password })
      .expect(200);
    expect(success.body.tokens.accessToken).toEqual(expect.any(String));
    const wrong = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: 'incorrecta' })
      .expect(401);
    const absent = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nadie@example.com', password: 'incorrecta' })
      .expect(401);
    expect(wrong.body).toEqual(absent.body);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('protege me y devuelve el usuario con un access token válido', async () => {
    const registered = await register();
    await request(ctx.app.getHttpServer()).get('/auth/me').expect(401);
    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer token.manipulado')
      .expect(401);
    const response = await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registered.body.tokens.accessToken}`)
      .expect(200);
    expect(response.body).toMatchObject({ id: registered.body.user.id, email: 'ana@example.com' });
  });

  it('rota refresh, rechaza el anterior y revoca sesiones al reutilizarlo', async () => {
    const registered = await register();
    const oldToken = registered.body.tokens.refreshToken as string;
    const rotated = await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldToken })
      .expect(200);
    expect(rotated.body.tokens.refreshToken).not.toBe(oldToken);
    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldToken })
      .expect(401);
    const reused = await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rotated.body.tokens.refreshToken })
      .expect(401);
    expect(reused.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rechaza refresh expirado', async () => {
    const registered = await register();
    await ctx.prisma.session.update({
      where: { refreshTokenHash: hashToken(registered.body.tokens.refreshToken) },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: registered.body.tokens.refreshToken })
      .expect(401);
    expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('cierra sesión de forma idempotente', async () => {
    const registered = await register();
    const token = registered.body.tokens.refreshToken as string;
    await request(ctx.app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: token })
      .expect(204);
    await request(ctx.app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: token })
      .expect(204);
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: token })
      .expect(401);
    expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('expone Google desactivado sin client id en tests', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/auth/providers').expect(200);
    expect(response.body).toEqual({ local: true, google: { enabled: false, webClientId: null } });
  });
});
