import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiProvider } from '../src/ai/ai.provider.js';
import { FakeAiProvider } from '../src/ai/fake-ai.provider.js';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import {
  bearer,
  completeWorkout,
  createWorkout,
  daysAgo,
  oneSet,
  registerUser,
  seedTestMovements,
  workoutDraft,
} from './helpers.js';

describe('IA: estado, consentimiento y operaciones', () => {
  const apiKey = 'clave-de-prueba-no-expuesta';
  let ctx: TestApp;
  let provider: FakeAiProvider;
  let token: string;

  const server = () => ctx.app.getHttpServer();
  const post = (path: string, body: object = {}) =>
    request(server()).post(path).set(bearer(token)).send(body);

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = apiKey;
    provider = new FakeAiProvider();
    ctx = await createTestApp((builder) => builder.overrideProvider(AiProvider).useValue(provider));
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
    token = await registerUser(ctx.app);
  });

  afterAll(async () => ctx.app.close());

  it('expone estado sin filtrar credenciales', async () => {
    const response = await request(server()).get('/ai/status').set(bearer(token)).expect(200);

    expect(response.body).toMatchObject({
      enabled: true,
      configured: true,
      provider: 'FAKE',
      model: 'fake',
      consentGivenAt: null,
    });
    expect(JSON.stringify(response.body)).not.toContain(apiKey);
  });

  it('exige consentimiento para las cuatro operaciones', async () => {
    const workout = await createWorkout(ctx.app, token, workoutDraft('Sin consentimiento'));
    await completeWorkout(
      ctx.app,
      token,
      workout.id,
      oneSet(workout.exercises[0].id, {
        setNumber: 1,
        reps: 5,
        loadValue: 80,
        loadUnit: 'KILOGRAM',
      }),
    );
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: 'pull-up' } });
    await ctx.prisma.wod.create({
      data: {
        slug: 'benchmark-ai',
        name: 'Benchmark IA',
        workoutType: 'FOR_TIME',
        repScheme: [21, 15, 9],
        isBenchmark: true,
        exercises: { create: { movementId: movement.id, position: 1 } },
      },
    });

    for (const call of [
      () => post('/ai/analyze/progress'),
      () => post(`/ai/analyze/workout/${workout.id}`),
      () => post('/ai/explain/wod/benchmark-ai'),
      () => post('/ai/explain/movement/pull-up'),
    ]) {
      const response = await call().expect(403);
      expect(response.body.code).toBe('AI_CONSENT_REQUIRED');
    }
  });

  it('conserva la fecha al consentir y permite revocarla', async () => {
    const first = await post('/ai/consent').expect(200);
    const repeated = await post('/ai/consent').expect(200);

    expect(repeated.body.consentGivenAt).toBe(first.body.consentGivenAt);
    await request(server())
      .delete('/ai/consent')
      .set(bearer(token))
      .expect(200)
      .expect({ consentGivenAt: null });
    const response = await post('/ai/analyze/progress').expect(403);
    expect(response.body.code).toBe('AI_CONSENT_REQUIRED');
  });

  it('analiza progreso con hechos resueltos y datos usados', async () => {
    await request(server())
      .post('/records')
      .set(bearer(token))
      .send({
        movementSlug: 'barbell-full-squat',
        recordType: 'WEIGHT',
        value: 100,
        unit: 'KILOGRAM',
        repetitions: 1,
        performedAt: daysAgo(5),
      })
      .expect(201);
    const workout = await createWorkout(ctx.app, token, workoutDraft('Sentadilla'));
    await completeWorkout(
      ctx.app,
      token,
      workout.id,
      oneSet(workout.exercises[0].id, {
        setNumber: 1,
        reps: 5,
        loadValue: 80,
        loadUnit: 'KILOGRAM',
      }),
      daysAgo(2),
    ).expect(201);
    await post('/ai/consent').expect(200);

    const response = await post('/ai/analyze/progress').expect(200);

    expect(response.body).toMatchObject({ status: 'COMPLETED', cached: false });
    expect(response.body.dataUsed.length).toBeGreaterThan(0);
    expect(response.body.observations[0].evidence[0]).toEqual(
      expect.objectContaining({ label: expect.any(String), value: expect.anything() }),
    );
  });

  it('no llama al proveedor cuando faltan datos', async () => {
    const generate = vi.spyOn(provider, 'generate');
    await post('/ai/consent').expect(200);

    const response = await post('/ai/analyze/progress').expect(200);

    expect(response.body).toMatchObject({ status: 'INSUFFICIENT_DATA', id: null });
    expect(generate).not.toHaveBeenCalled();
  });

  it('analiza sólo entrenamientos completados y distingue ausentes', async () => {
    const draft = await createWorkout(ctx.app, token, workoutDraft('Borrador'));
    const completed = await createWorkout(ctx.app, token, workoutDraft('Completado'));
    await completeWorkout(
      ctx.app,
      token,
      completed.id,
      oneSet(completed.exercises[0].id, {
        setNumber: 1,
        reps: 5,
        loadValue: 70,
        loadUnit: 'KILOGRAM',
      }),
    ).expect(201);
    await post('/ai/consent').expect(200);

    const analysis = await post(`/ai/analyze/workout/${completed.id}`).expect(200);
    expect(analysis.body.observations[0].evidence[0]).toEqual(
      expect.objectContaining({ label: expect.any(String), value: expect.anything() }),
    );
    expect((await post(`/ai/analyze/workout/${draft.id}`).expect(409)).body.code).toBe(
      'WORKOUT_INVALID_STATE',
    );
    expect(
      (await post('/ai/analyze/workout/01900000-0000-7000-8000-000000000000').expect(404)).body
        .code,
    ).toBe('WORKOUT_NOT_FOUND');
  });

  it('explica WODs benchmark y movimientos del catálogo', async () => {
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: 'pull-up' } });
    await ctx.prisma.wod.create({
      data: {
        slug: 'fran-ai',
        name: 'Fran IA',
        workoutType: 'FOR_TIME',
        repScheme: [21, 15, 9],
        isBenchmark: true,
        exercises: { create: { movementId: movement.id, position: 1 } },
      },
    });
    await post('/ai/consent').expect(200);

    expect((await post('/ai/explain/wod/fran-ai').expect(200)).body.status).toBe('COMPLETED');
    expect((await post('/ai/explain/movement/pull-up').expect(200)).body.status).toBe('COMPLETED');
    expect((await post('/ai/explain/wod/no-existe').expect(404)).body.code).toBe('WOD_NOT_FOUND');
    expect((await post('/ai/explain/movement/no-existe').expect(404)).body.code).toBe(
      'MOVEMENT_NOT_FOUND',
    );
  });
});
