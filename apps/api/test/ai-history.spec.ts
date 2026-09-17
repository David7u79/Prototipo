import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiProvider } from '../src/ai/ai.provider.js';
import { FakeAiProvider } from '../src/ai/fake-ai.provider.js';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import {
  bearer,
  completeWorkout,
  createWorkout,
  oneSet,
  registerUser,
  seedTestMovements,
  workoutDraft,
} from './helpers.js';

describe('historial de análisis de IA', () => {
  let ctx: TestApp;
  let provider: FakeAiProvider;
  let token: string;
  const server = () => ctx.app.getHttpServer();

  beforeAll(async () => {
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

  it('lista análisis con etiquetas, orden, paginación y filtro', async () => {
    const workout = await completedWorkout('Entrenamiento guardado');
    const wod = await createWod('wod-historial', 'WOD guardado');
    await consent();
    const workoutAnalysis = await post(`/ai/analyze/workout/${workout.id}`).expect(200);
    const wodAnalysis = await post(`/ai/explain/wod/${wod.slug}`).expect(200);
    const movementAnalysis = await post('/ai/explain/movement/pull-up').expect(200);
    const progressAnalysis = await post('/ai/analyze/progress').expect(200);
    await ctx.prisma.aiAnalysis.update({
      where: { id: workoutAnalysis.body.id },
      data: { createdAt: new Date('2026-01-01T00:00:00.000Z') },
    });
    await ctx.prisma.aiAnalysis.update({
      where: { id: wodAnalysis.body.id },
      data: { createdAt: new Date('2026-01-02T00:00:00.000Z') },
    });
    await ctx.prisma.aiAnalysis.update({
      where: { id: movementAnalysis.body.id },
      data: { createdAt: new Date('2026-01-03T00:00:00.000Z') },
    });
    await ctx.prisma.aiAnalysis.update({
      where: { id: progressAnalysis.body.id },
      data: { createdAt: new Date('2026-01-04T00:00:00.000Z') },
    });

    const listed = await request(server()).get('/ai/analyses').set(bearer(token)).expect(200);
    expect(listed.body.items).toEqual([
      expect.objectContaining({ id: progressAnalysis.body.id, targetLabel: null, periodDays: 30 }),
      expect.objectContaining({ id: movementAnalysis.body.id, targetLabel: 'Pull-up' }),
      expect.objectContaining({ id: wodAnalysis.body.id, targetLabel: 'WOD guardado' }),
      expect.objectContaining({
        id: workoutAnalysis.body.id,
        targetLabel: 'Entrenamiento guardado',
      }),
    ]);
    expect(
      listed.body.items.find((item: { id: string }) => item.id === workoutAnalysis.body.id)
        .periodDays,
    ).toBeNull();
    const page = await request(server())
      .get('/ai/analyses?page=2&limit=2')
      .set(bearer(token))
      .expect(200);
    expect(page.body).toMatchObject({ page: 2, limit: 2, total: 4, totalPages: 2 });
    expect(page.body.items).toHaveLength(2);
    const filtered = await request(server())
      .get('/ai/analyses?type=WOD_EXPLANATION')
      .set(bearer(token))
      .expect(200);
    expect(filtered.body.items).toEqual([expect.objectContaining({ id: wodAnalysis.body.id })]);
  });

  it('aísla, muestra el detalle guardado sin regenerarlo y permite borrados propios', async () => {
    const workout = await completedWorkout('Detalle guardado');
    await consent();
    const generated = await post(`/ai/analyze/workout/${workout.id}`).expect(200);
    const generate = vi.spyOn(provider, 'generate');
    const detail = await request(server())
      .get(`/ai/analyses/${generated.body.id}`)
      .set(bearer(token))
      .expect(200);
    expect(detail.body).toMatchObject({
      id: generated.body.id,
      cached: true,
      summary: generated.body.summary,
      observations: generated.body.observations,
    });
    expect(detail.body.dataUsed).toEqual(generated.body.dataUsed);
    expect(generate).not.toHaveBeenCalled();
    expect(JSON.stringify(detail.body)).not.toContain('TAREA:');
    expect(JSON.stringify(detail.body)).not.toContain('garfit_data');

    const other = await registerUser(ctx.app, 'Otro atleta');
    await request(server()).post('/ai/consent').set(bearer(other)).expect(200);
    const otherAnalysis = await request(server())
      .post('/ai/explain/movement/pull-up')
      .set(bearer(other))
      .send({})
      .expect(200);
    await request(server())
      .get(`/ai/analyses/${otherAnalysis.body.id}`)
      .set(bearer(token))
      .expect(404);
    await request(server())
      .delete(`/ai/analyses/${otherAnalysis.body.id}`)
      .set(bearer(token))
      .expect(404);
    expect((await request(server()).get('/ai/analyses').set(bearer(other))).body.total).toBe(1);
    await request(server())
      .delete(`/ai/analyses/${generated.body.id}`)
      .set(bearer(token))
      .expect(204);
    expect((await request(server()).get('/ai/analyses').set(bearer(token))).body.total).toBe(0);
  });

  it('borra únicamente el historial autenticado y conserva lo previo al revocar consentimiento', async () => {
    await consent();
    const mine = await post('/ai/explain/movement/pull-up').expect(200);
    const other = await registerUser(ctx.app, 'Otro atleta');
    await request(server()).post('/ai/consent').set(bearer(other)).expect(200);
    await request(server())
      .post('/ai/explain/movement/pull-up')
      .set(bearer(other))
      .send({})
      .expect(200);
    await request(server()).delete('/ai/analyses').set(bearer(token)).expect(204);
    expect((await request(server()).get('/ai/analyses').set(bearer(token))).body.total).toBe(0);
    expect((await request(server()).get('/ai/analyses').set(bearer(other))).body.total).toBe(1);

    const retained = await request(server())
      .post('/ai/explain/movement/barbell-deadlift')
      .set(bearer(other))
      .send({})
      .expect(200);
    await request(server()).delete('/ai/consent').set(bearer(other)).expect(200);
    expect((await request(server()).get('/ai/analyses').set(bearer(other))).body.total).toBe(2);
    await request(server()).get(`/ai/analyses/${retained.body.id}`).set(bearer(other)).expect(200);
    const response = await request(server())
      .post('/ai/explain/movement/pull-up')
      .set(bearer(other))
      .send({})
      .expect(403);
    expect(response.body.code).toBe('AI_CONSENT_REQUIRED');
    expect(mine.body.id).toBeTruthy();
  });

  const post = (path: string) => request(server()).post(path).set(bearer(token)).send({});
  const consent = () => post('/ai/consent').expect(200);
  async function completedWorkout(name: string) {
    const workout = await createWorkout(ctx.app, token, workoutDraft(name));
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
    ).expect(201);
    return workout;
  }
  async function createWod(slug: string, name: string) {
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: 'pull-up' } });
    return ctx.prisma.wod.create({
      data: {
        slug,
        name,
        workoutType: 'FOR_TIME',
        repScheme: [21, 15, 9],
        isBenchmark: true,
        exercises: { create: { movementId: movement.id, position: 1, reps: 21 } },
      },
    });
  }
});
