import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { bearer, daysAgo, registerUser } from './helpers.js';

describe('perfil deportivo ampliado', () => {
  let ctx: TestApp;
  let token: string;
  const base = { displayName: 'Ana', experienceLevel: 'INTERMEDIATE', primaryGoal: 'STRENGTH' };
  const put = (body: object) =>
    request(ctx.app.getHttpServer()).put('/profile').set(bearer(token)).send(body);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    token = await registerUser(ctx.app);
  });
  afterAll(async () => ctx.app.close());

  it('guarda los campos opcionales ausentes como null y METRIC por defecto', async () => {
    const response = await put(base).expect(200);
    expect(response.body).toMatchObject({
      preferredUnits: 'METRIC',
      birthDate: null,
      heightCm: null,
      weightKg: null,
      trainingSince: null,
    });
  });

  it('guarda unidades, fechas y medidas con sus tipos', async () => {
    const response = await put({
      ...base,
      preferredUnits: 'IMPERIAL',
      birthDate: '1998-04-21',
      heightCm: 172.5,
      weightKg: 70.25,
      trainingSince: '2020-01-15',
    }).expect(200);
    expect(response.body).toMatchObject({
      preferredUnits: 'IMPERIAL',
      birthDate: '1998-04-21',
      heightCm: 172.5,
      weightKg: 70.25,
      trainingSince: '2020-01-15',
    });
  });

  it('PUT reemplaza el perfil completo: un campo omitido vuelve a null', async () => {
    await put({ ...base, heightCm: 180 }).expect(200);
    const response = await put(base).expect(200);
    expect(response.body.heightCm).toBeNull();
  });

  it('rechaza fechas inválidas, futuras y edades fuera de rango', async () => {
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    for (const birthDate of ['2026-02-30', '21/04/1998', future, daysAgo(365), '1890-01-01']) {
      const response = await put({ ...base, birthDate });
      expect(response.status, birthDate).toBe(400);
      expect(response.body.code, birthDate).toBe('VALIDATION_FAILED');
    }
  });

  it('rechaza trainingSince anterior a birthDate', async () => {
    const response = await put({ ...base, birthDate: '2000-01-01', trainingSince: '1999-12-31' });
    expect(response.status).toBe(400);
  });

  it('rechaza medidas fuera de límites o con decimales de más', async () => {
    for (const extra of [
      { heightCm: 40 },
      { heightCm: 300 },
      { heightCm: 170.55 },
      { weightKg: 10 },
      { weightKg: 70.123 },
      { preferredUnits: 'STONE' },
    ]) {
      const response = await put({ ...base, ...extra });
      expect(response.status, JSON.stringify(extra)).toBe(400);
    }
  });

  it('no acepta campos no previstos (p. ej. datos médicos)', async () => {
    const response = await put({ ...base, injuries: 'rodilla' });
    expect(response.status).toBe(400);
  });
});
