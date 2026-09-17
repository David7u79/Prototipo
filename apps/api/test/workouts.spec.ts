import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import {
  bearer,
  createWorkout,
  oneSet,
  registerUser,
  seedTestMovements,
  workoutDraft,
} from './helpers.js';

describe('workouts', () => {
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

  it('crea libre conservando orden y objetivos', async () => {
    const workout = await createWorkout(
      ctx.app,
      token,
      workoutDraft('Libre', 'STRENGTH', 'barbell-full-squat', {
        exercises: [
          {
            ...exercise('barbell-full-squat'),
            targetSets: 3,
            targetReps: 5,
            targetLoadValue: 225,
            targetLoadUnit: 'POUND',
          },
          exercise('pull-up'),
        ],
      }),
    );
    expect(workout).toMatchObject({
      status: 'DRAFT',
      exercises: [
        { position: 1, targetSets: 3, targetReps: 5, targetLoadValue: 225 },
        { position: 2 },
      ],
    });
  });

  it('crea desde WOD copiando prescripción y rechaza WOD inexistente', async () => {
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: 'run' } });
    await ctx.prisma.wod.create({
      data: {
        slug: 'carrera-5k',
        name: 'Carrera 5k',
        workoutType: 'CARDIO',
        repScheme: [],
        exercises: {
          create: {
            movementId: movement.id,
            position: 1,
            distanceValue: 5,
            distanceUnit: 'KILOMETER',
          },
        },
      },
    });
    const created = await createWorkout(ctx.app, token, { wodSlug: 'carrera-5k' });
    expect(created).toMatchObject({
      wod: { slug: 'carrera-5k' },
      workoutType: 'CARDIO',
      exercises: [{ targetDistanceValue: 5, targetDistanceUnit: 'KILOMETER' }],
    });
    const missing = await request(server())
      .post('/workouts')
      .set(bearer(token))
      .send({ wodSlug: 'no' })
      .expect(404);
    expect(missing.body.code).toBe('WOD_NOT_FOUND');
  });

  it('rechaza movimiento inválido, campos extra y más de treinta ejercicios', async () => {
    const missing = await request(server())
      .post('/workouts')
      .set(bearer(token))
      .send(workoutDraft('x', 'STRENGTH', 'no'))
      .expect(404);
    expect(missing.body.code).toBe('MOVEMENT_NOT_FOUND');
    for (const body of [
      { ...workoutDraft('x'), userId: 'x', status: 'COMPLETED' },
      workoutDraft('x', 'STRENGTH', 'barbell-full-squat', {
        exercises: Array.from({ length: 31 }, () => exercise()),
      }),
    ])
      await request(server()).post('/workouts').set(bearer(token)).send(body).expect(400);
  });

  it('aísla todas las operaciones y valida UUID', async () => {
    const workout = await createWorkout(ctx.app, token, workoutDraft('Privado'));
    const other = await registerUser(ctx.app, 'B');
    for (const call of [
      () => request(server()).get(`/workouts/${workout.id}`),
      () => request(server()).patch(`/workouts/${workout.id}`).send({ name: 'x' }),
      () => request(server()).delete(`/workouts/${workout.id}`),
      () => request(server()).post(`/workouts/${workout.id}/start`),
      () =>
        request(server())
          .put(`/workouts/${workout.id}/results`)
          .send(oneSet(workout.exercises[0].id, { setNumber: 1, reps: 1 })),
      () => request(server()).post(`/workouts/${workout.id}/complete`).send({}),
    ]) {
      const response = await call().set(bearer(other)).expect(404);
      expect(response.body.code).toBe('WORKOUT_NOT_FOUND');
    }
    await request(server()).get('/workouts/no').set(bearer(token)).expect(400);
    expect(
      (await request(server()).get(`/workouts/${workout.id}`).set(bearer(token))).body.name,
    ).toBe('Privado');
  });

  it('reemplaza ejercicios en draft, inicia y bloquea PATCH en progreso', async () => {
    const workout = await createWorkout(ctx.app, token, workoutDraft('Editable'));
    const patched = await request(server())
      .patch(`/workouts/${workout.id}`)
      .set(bearer(token))
      .send({ exercises: [exercise('pull-up')] })
      .expect(200);
    expect(patched.body.exercises).toMatchObject([{ movement: { slug: 'pull-up' } }]);
    const started = await request(server())
      .post(`/workouts/${workout.id}/start`)
      .set(bearer(token))
      .expect(201);
    expect(started.body).toMatchObject({ status: 'IN_PROGRESS', startedAt: expect.any(String) });
    expect(
      (
        await request(server())
          .patch(`/workouts/${workout.id}`)
          .set(bearer(token))
          .send({ name: 'no' })
      ).body.code,
    ).toBe('WORKOUT_INVALID_STATE');
  });

  it('guarda resultados canónicos y valida score, ejercicio, duplicados y límite de series', async () => {
    const workout = await createWorkout(ctx.app, token, workoutDraft('Series'));
    const id = workout.exercises[0].id;
    const saved = await request(server())
      .put(`/workouts/${workout.id}/results`)
      .set(bearer(token))
      .send(
        oneSet(id, {
          setNumber: 1,
          reps: 5,
          loadValue: 225,
          loadUnit: 'POUND',
          distanceValue: 2,
          distanceUnit: 'KILOMETER',
        }),
      )
      .expect(200);
    expect(saved.body.exercises[0].results[0]).toMatchObject({
      loadKg: 102.058,
      distanceMeters: 2000,
    });
    const invalid = oneSet(id, { setNumber: 1, reps: 1 }, { rounds: 1 });
    await request(server())
      .put(`/workouts/${workout.id}/results`)
      .set(bearer(token))
      .send(invalid)
      .expect(400);
    await request(server())
      .put(`/workouts/${workout.id}/results`)
      .set(bearer(token))
      .send(oneSet('00000000-0000-0000-0000-000000000000', { setNumber: 1, reps: 1 }))
      .expect(400);
    await request(server())
      .put(`/workouts/${workout.id}/results`)
      .set(bearer(token))
      .send({
        exercises: [
          {
            exerciseId: id,
            sets: [
              { setNumber: 1, reps: 1 },
              { setNumber: 1, reps: 2 },
            ],
          },
        ],
        score: null,
      })
      .expect(400);
  });

  it('lista con paginación y filtros, y borra lógicamente', async () => {
    const first = await createWorkout(ctx.app, token, workoutDraft('Uno'));
    await createWorkout(ctx.app, token, workoutDraft('Dos', 'STRENGTH', 'pull-up'));
    const list = await request(server())
      .get('/workouts?page=1&limit=1&workoutType=STRENGTH&movement=pull-up')
      .set(bearer(token))
      .expect(200);
    expect(list.body).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
    await request(server()).get('/workouts?limit=51').set(bearer(token)).expect(400);
    await request(server()).delete(`/workouts/${first.id}`).set(bearer(token)).expect(204);
    expect(
      (await request(server()).get(`/workouts/${first.id}`).set(bearer(token)).expect(404)).body
        .code,
    ).toBe('WORKOUT_NOT_FOUND');
  });
});
function exercise(movementSlug = 'barbell-full-squat') {
  return {
    movementSlug,
    targetSets: null,
    targetReps: null,
    targetLoadValue: null,
    targetLoadUnit: null,
    targetDistanceValue: null,
    targetDistanceUnit: null,
    targetDurationSeconds: null,
    restSeconds: null,
    notes: null,
  };
}
