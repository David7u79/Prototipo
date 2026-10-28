import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

describe('datos biométricos de smartwatch (/workouts/:id/biometrics)', () => {
  let ctx: TestApp;
  let token: string;
  const server = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
    token = await registerUser(ctx.app);
  });

  afterAll(async () => ctx.app.close());

  async function createAndComplete(userToken = token) {
    const workout = await createWorkout(ctx.app, userToken, workoutDraft('Entrenamiento completado'));
    const exerciseId = workout.exercises[0].id;
    const completed = await completeWorkout(
      ctx.app,
      userToken,
      workout.id,
      oneSet(exerciseId, { setNumber: 1, reps: 5, loadValue: 100, loadUnit: 'KILOGRAM' }),
    ).expect(201);
    return completed.body;
  }

  const validBiometrics = {
    avgHeartRateBpm: 145,
    maxHeartRateBpm: 178,
    activeCaloriesKcal: 420,
    startedAt: '2026-10-28T10:00:00.000Z',
    endedAt: '2026-10-28T11:00:00.000Z',
    source: 'HEALTH_CONNECT' as const,
    externalId: 'session-external-123',
  };

  it('PUT feliz devuelve detalle completo con biometrics y segundo PUT reemplaza (idempotente)', async () => {
    const workout = await createAndComplete();

    const putRes = await request(server())
      .put(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .send(validBiometrics)
      .expect(200);

    expect(putRes.body.id).toBe(workout.id);
    expect(putRes.body.biometrics).toMatchObject({
      avgHeartRateBpm: 145,
      maxHeartRateBpm: 178,
      activeCaloriesKcal: 420,
      startedAt: '2026-10-28T10:00:00.000Z',
      endedAt: '2026-10-28T11:00:00.000Z',
      source: 'HEALTH_CONNECT',
      externalId: 'session-external-123',
      updatedAt: expect.any(String),
    });

    const replacedRes = await request(server())
      .put(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .send({
        avgHeartRateBpm: 150,
        maxHeartRateBpm: 180,
        activeCaloriesKcal: 480,
        startedAt: '2026-10-28T10:05:00.000Z',
        endedAt: '2026-10-28T11:05:00.000Z',
        source: 'WEAR_OS',
        externalId: 'wear-456',
      })
      .expect(200);

    expect(replacedRes.body.biometrics).toMatchObject({
      avgHeartRateBpm: 150,
      maxHeartRateBpm: 180,
      activeCaloriesKcal: 480,
      startedAt: '2026-10-28T10:05:00.000Z',
      endedAt: '2026-10-28T11:05:00.000Z',
      source: 'WEAR_OS',
      externalId: 'wear-456',
    });
  });

  it('GET detalle incluye biometrics y la lista paginada NO lo incluye', async () => {
    const workout = await createAndComplete();

    await request(server())
      .put(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .send(validBiometrics)
      .expect(200);

    const getRes = await request(server())
      .get(`/workouts/${workout.id}`)
      .set(bearer(token))
      .expect(200);

    expect(getRes.body.biometrics).toMatchObject({
      avgHeartRateBpm: 145,
      maxHeartRateBpm: 178,
      activeCaloriesKcal: 420,
      source: 'HEALTH_CONNECT',
    });

    const listRes = await request(server())
      .get('/workouts')
      .set(bearer(token))
      .expect(200);

    expect(listRes.body.items[0]).not.toHaveProperty('biometrics');
  });

  it('DELETE devuelve 204 y luego el detalle muestra biometrics como null (también si no existía)', async () => {
    const workout = await createAndComplete();

    await request(server())
      .put(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .send(validBiometrics)
      .expect(200);

    await request(server())
      .delete(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .expect(204);

    const getRes = await request(server())
      .get(`/workouts/${workout.id}`)
      .set(bearer(token))
      .expect(200);

    expect(getRes.body.biometrics).toBeNull();

    // DELETE cuando ya no existe o nunca existió también devuelve 204
    await request(server())
      .delete(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .expect(204);
  });

  it('responde 400 por FC fuera de rango, max < avg, endedAt <= startedAt y todo null', async () => {
    const workout = await createAndComplete();
    const put = (data: object) =>
      request(server()).put(`/workouts/${workout.id}/biometrics`).set(bearer(token)).send(data);

    // FC fuera de rango (< 30 o > 250)
    await put({ ...validBiometrics, avgHeartRateBpm: 29 }).expect(400);
    await put({ ...validBiometrics, avgHeartRateBpm: 251 }).expect(400);
    await put({ ...validBiometrics, maxHeartRateBpm: 251 }).expect(400);
    await put({ ...validBiometrics, maxHeartRateBpm: 29 }).expect(400);

    // max < avg
    await put({ ...validBiometrics, avgHeartRateBpm: 160, maxHeartRateBpm: 150 }).expect(400);

    // endedAt <= startedAt
    await put({
      ...validBiometrics,
      startedAt: '2026-10-28T11:00:00.000Z',
      endedAt: '2026-10-28T10:00:00.000Z',
    }).expect(400);
    await put({
      ...validBiometrics,
      startedAt: '2026-10-28T10:00:00.000Z',
      endedAt: '2026-10-28T10:00:00.000Z',
    }).expect(400);

    // Todo null (al menos una de las tres métricas debe estar presente)
    await put({
      startedAt: '2026-10-28T10:00:00.000Z',
      endedAt: '2026-10-28T11:00:00.000Z',
      source: 'HEALTH_CONNECT',
      avgHeartRateBpm: null,
      maxHeartRateBpm: null,
      activeCaloriesKcal: null,
    }).expect(400);
  });

  it('responde 404 ante entrenamiento de otro usuario o borrado lógico', async () => {
    const otherToken = await registerUser(ctx.app, 'OtroAtleta');
    const workout = await createAndComplete();

    // Otro usuario
    const foreignPut = await request(server())
      .put(`/workouts/${workout.id}/biometrics`)
      .set(bearer(otherToken))
      .send(validBiometrics)
      .expect(404);
    expect(foreignPut.body.code).toBe('WORKOUT_NOT_FOUND');

    const foreignDelete = await request(server())
      .delete(`/workouts/${workout.id}/biometrics`)
      .set(bearer(otherToken))
      .expect(404);
    expect(foreignDelete.body.code).toBe('WORKOUT_NOT_FOUND');

    // Borrado lógico
    await request(server())
      .delete(`/workouts/${workout.id}`)
      .set(bearer(token))
      .expect(204);

    const deletedPut = await request(server())
      .put(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .send(validBiometrics)
      .expect(404);
    expect(deletedPut.body.code).toBe('WORKOUT_NOT_FOUND');

    const deletedDelete = await request(server())
      .delete(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .expect(404);
    expect(deletedDelete.body.code).toBe('WORKOUT_NOT_FOUND');
  });

  it('responde 409 con WORKOUT_INVALID_STATE si el entrenamiento no está completado', async () => {
    const draft = await createWorkout(ctx.app, token, workoutDraft('Borrador'));

    const draftPut = await request(server())
      .put(`/workouts/${draft.id}/biometrics`)
      .set(bearer(token))
      .send(validBiometrics)
      .expect(409);
    expect(draftPut.body.code).toBe('WORKOUT_INVALID_STATE');

    const draftDelete = await request(server())
      .delete(`/workouts/${draft.id}/biometrics`)
      .set(bearer(token))
      .expect(409);
    expect(draftDelete.body.code).toBe('WORKOUT_INVALID_STATE');

    // Estado IN_PROGRESS
    await request(server())
      .post(`/workouts/${draft.id}/start`)
      .set(bearer(token))
      .expect(201);

    const inProgressPut = await request(server())
      .put(`/workouts/${draft.id}/biometrics`)
      .set(bearer(token))
      .send(validBiometrics)
      .expect(409);
    expect(inProgressPut.body.code).toBe('WORKOUT_INVALID_STATE');
  });

  it('borrar el workout no deja fila huérfana en WorkoutBiometrics (cascade o lógico: comprueba que no aparece)', async () => {
    const workout = await createAndComplete();

    await request(server())
      .put(`/workouts/${workout.id}/biometrics`)
      .set(bearer(token))
      .send(validBiometrics)
      .expect(200);

    const beforeDelete = await ctx.prisma.workoutBiometrics.findUnique({
      where: { workoutId: workout.id },
    });
    expect(beforeDelete).not.toBeNull();

    // Borrado lógico vía API: comprueba que el endpoint no lo devuelve ni permite operar sobre él
    await request(server())
      .delete(`/workouts/${workout.id}`)
      .set(bearer(token))
      .expect(204);

    await request(server())
      .get(`/workouts/${workout.id}`)
      .set(bearer(token))
      .expect(404);

    // Borrado en cascada en base de datos: comprueba que no queda fila huérfana en WorkoutBiometrics
    await ctx.prisma.personalRecord.deleteMany({
      where: { workoutResult: { workoutExercise: { workoutId: workout.id } } },
    });
    await ctx.prisma.workout.delete({
      where: { id: workout.id },
    });

    const orphan = await ctx.prisma.workoutBiometrics.findUnique({
      where: { workoutId: workout.id },
    });
    expect(orphan).toBeNull();
  });
});
