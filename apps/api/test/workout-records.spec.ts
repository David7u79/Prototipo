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

describe('marcas derivadas de workouts', () => {
  let ctx: TestApp;
  let token: string;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
    token = await registerUser(ctx.app);
  });
  afterAll(async () => ctx.app.close());

  it('crea 1RM, informa cambio y no registra empates o regresiones', async () => {
    const first = await strength(100);
    const one = first.personalRecords[0];
    expect(one).toMatchObject({
      previousBest: null,
      change: null,
      record: { source: 'WORKOUT', origin: { setNumber: 1 } },
    });
    const second = await strength(105);
    expect(second.personalRecords[0]).toMatchObject({
      previousBest: 100,
      change: { absolute: 5, percent: 5, improved: true },
    });
    expect((await strength(105)).personalRecords).toEqual([]);
    expect((await strength(95)).personalRecords).toEqual([]);
    const records = await request(ctx.app.getHttpServer())
      .get('/records/barbell-full-squat')
      .set(bearer(token))
      .expect(200);
    expect(records.body.series[0].best.value).toBe(105);
  });

  it('separa RM, conserva sólo la mejor de una serie y crea REPS sin carga', async () => {
    const workout = await createWorkout(ctx.app, token, workoutDraft('RM'));
    const id = workout.exercises[0].id;
    const completed = await completeWorkout(ctx.app, token, workout.id, {
      exercises: [
        {
          exerciseId: id,
          sets: [
            { setNumber: 1, reps: 5, loadValue: 90, loadUnit: 'KILOGRAM' },
            { setNumber: 2, reps: 5, loadValue: 100, loadUnit: 'KILOGRAM' },
            { setNumber: 3, reps: 1, loadValue: 120, loadUnit: 'KILOGRAM' },
          ],
        },
      ],
      score: null,
    }).expect(201);
    expect(
      completed.body.personalRecords
        .map((item: { record: { repetitions: number | null } }) => item.record.repetitions)
        .sort(),
    ).toEqual([1, 5]);
    const pullup = await createWorkout(ctx.app, token, workoutDraft('Pull', 'STRENGTH', 'pull-up'));
    const reps = await completeWorkout(
      ctx.app,
      token,
      pullup.id,
      oneSet(pullup.exercises[0].id, { setNumber: 1, reps: 20 }),
    ).expect(201);
    expect(reps.body.personalRecords[0].record.recordType).toBe('REPS');
  });

  it('crea TIME y DISTANCE para cardio, separando 5k y 10k', async () => {
    const first = await cardio(5, 1420);
    expect(
      first.personalRecords
        .map((x: { record: { recordType: string } }) => x.record.recordType)
        .sort(),
    ).toEqual(['DISTANCE', 'TIME']);
    const improved = await cardio(5, 1400);
    expect(
      improved.personalRecords.find(
        (x: { record: { recordType: string } }) => x.record.recordType === 'TIME',
      ),
    ).toMatchObject({ change: { absolute: -20, improved: true } });
    const ten = await cardio(10, 3000);
    expect(
      ten.personalRecords.find(
        (x: { record: { recordType: string } }) => x.record.recordType === 'TIME',
      ),
    ).toMatchObject({ previousBest: null });
  });

  it('valida completitud por tipo y acepta resultados al completar', async () => {
    for (const type of ['FOR_TIME', 'AMRAP', 'STRENGTH'] as const) {
      const workout = await createWorkout(
        ctx.app,
        token,
        workoutDraft(type, type, type === 'STRENGTH' ? 'barbell-full-squat' : 'run'),
      );
      const response = await completeWorkout(ctx.app, token, workout.id, {
        exercises: [],
        score: null,
      }).expect(422);
      expect(response.body).toMatchObject({
        code: 'WORKOUT_INCOMPLETE',
        details: expect.any(Array),
      });
    }
    const workout = await createWorkout(ctx.app, token, workoutDraft('Una llamada'));
    expect(
      (
        await completeWorkout(
          ctx.app,
          token,
          workout.id,
          oneSet(workout.exercises[0].id, {
            setNumber: 1,
            reps: 1,
            loadValue: 100,
            loadUnit: 'KILOGRAM',
          }),
        )
      ).body.status,
    ).toBe('COMPLETED');
  });

  it('es idempotente y serializa completados concurrentes', async () => {
    const workout = await createWorkout(ctx.app, token, workoutDraft('Idempotente'));
    const results = oneSet(workout.exercises[0].id, {
      setNumber: 1,
      reps: 1,
      loadValue: 100,
      loadUnit: 'KILOGRAM',
    });
    const responses = await Promise.all(
      Array.from({ length: 3 }, () => completeWorkout(ctx.app, token, workout.id, results)),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201, 201]);
    expect(
      await ctx.prisma.personalRecord.count({ where: { source: 'WORKOUT', deletedAt: null } }),
    ).toBe(1);
  });

  async function strength(load: number) {
    const workout = await createWorkout(ctx.app, token, workoutDraft(`Fuerza ${load}`));
    return (
      await completeWorkout(
        ctx.app,
        token,
        workout.id,
        oneSet(workout.exercises[0].id, {
          setNumber: 1,
          reps: 1,
          loadValue: load,
          loadUnit: 'KILOGRAM',
        }),
      )
    ).body;
  }
  async function cardio(km: number, seconds: number) {
    const workout = await createWorkout(ctx.app, token, workoutDraft(`Run ${km}`, 'CARDIO', 'run'));
    return (
      await completeWorkout(
        ctx.app,
        token,
        workout.id,
        oneSet(workout.exercises[0].id, {
          setNumber: 1,
          distanceValue: km,
          distanceUnit: 'KILOMETER',
          durationSeconds: seconds,
        }),
      )
    ).body;
  }
});
