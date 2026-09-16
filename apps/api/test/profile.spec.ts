import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';

describe('GET y PUT /profile', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => resetDatabase(ctx.prisma));
  afterAll(async () => ctx.app.close());

  async function user(email: string) {
    const response = await request(ctx.app.getHttpServer()).post('/auth/register').send({
      email,
      password: 'password123',
      name: 'Ana',
    });
    return response.body.tokens.accessToken as string;
  }
  const payload = { displayName: 'Ana', experienceLevel: 'BEGINNER', primaryGoal: 'STRENGTH' };
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('requiere token', async () => {
    await request(ctx.app.getHttpServer()).get('/profile').expect(401);
    await request(ctx.app.getHttpServer()).put('/profile').send(payload).expect(401);
  });
  it('crea, consulta y actualiza el mismo perfil', async () => {
    const token = await user('ana@example.com');
    expect(
      (await request(ctx.app.getHttpServer()).get('/profile').set(bearer(token))).body.code,
    ).toBe('PROFILE_NOT_FOUND');
    const created = await request(ctx.app.getHttpServer())
      .put('/profile')
      .set(bearer(token))
      .send(payload);
    const fetched = await request(ctx.app.getHttpServer()).get('/profile').set(bearer(token));
    const updated = await request(ctx.app.getHttpServer())
      .put('/profile')
      .set(bearer(token))
      .send({
        ...payload,
        displayName: 'Ana María',
      });
    expect(created.status).toBe(200);
    expect(fetched.body).toMatchObject(payload);
    expect(updated.body).toMatchObject({ id: created.body.id, displayName: 'Ana María' });
  });
  it('valida experiencia y nombre', async () => {
    const token = await user('ana@example.com');
    const response = await request(ctx.app.getHttpServer())
      .put('/profile')
      .set(bearer(token))
      .send({
        ...payload,
        displayName: '',
        experienceLevel: 'ELITE',
      });
    expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
  });
  it('aísla los perfiles entre usuarios', async () => {
    const first = await user('ana@example.com');
    const second = await user('bea@example.com');
    await request(ctx.app.getHttpServer())
      .put('/profile')
      .set(bearer(first))
      .send(payload)
      .expect(200);
    expect(
      (await request(ctx.app.getHttpServer()).get('/profile').set(bearer(second))).body.code,
    ).toBe('PROFILE_NOT_FOUND');
  });
});
