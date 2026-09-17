import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
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

describe('GET /workouts/stats', () => {
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

  it('devuelve ceros cuando no hay entrenamientos', async () => {
    const stats = await request(ctx.app.getHttpServer())
      .get('/workouts/stats')
      .set(bearer(token))
      .expect(200);
    expect(stats.body).toEqual({
      totalCompleted: 0,
      last7Days: 0,
      last30Days: 0,
      lastWorkout: null,
      personalRecordsFromWorkoutsLast30Days: 0,
      recentPersonalRecords: [],
      volumeByMovementLast30Days: [],
      periodComparison: {
        days: 30,
        current: { workouts: 0, trainingDays: 0, volumeKg: 0, personalRecords: 0 },
        previous: { workouts: 0, trainingDays: 0, volumeKg: 0, personalRecords: 0 },
        change: {
          workouts: { absolute: 0, percent: null },
          trainingDays: { absolute: 0, percent: null },
          volumeKg: { absolute: 0, percent: null },
          personalRecords: { absolute: 0, percent: null },
        },
      },
    });
  });

  it('calcula ventanas, último, volumen y omite drafts y borrados', async () => {
    const today = await completed('Hoy', 0);
    await completed('Cinco', 5);
    await completed('Veinte', 20);
    await completed('Cuarenta', 40);
    await createWorkout(ctx.app, token, workoutDraft('Draft'));
    const stats = await request(ctx.app.getHttpServer())
      .get('/workouts/stats')
      .set(bearer(token))
      .expect(200);
    expect(stats.body).toMatchObject({
      totalCompleted: 4,
      last7Days: 2,
      last30Days: 3,
      lastWorkout: { id: today.id },
      volumeByMovementLast30Days: [{ movement: { slug: 'barbell-full-squat' }, volumeKg: 1500 }],
      personalRecordsFromWorkoutsLast30Days: 1,
    });
    await request(ctx.app.getHttpServer())
      .delete(`/workouts/${today.id}`)
      .set(bearer(token))
      .expect(204);
    expect(
      (await request(ctx.app.getHttpServer()).get('/workouts/stats').set(bearer(token))).body
        .totalCompleted,
    ).toBe(3);
  });

  it('compara las métricas del periodo actual con las del anterior', async () => {
    await completed('Actual uno', 5);
    await completed('Actual dos', 10);
    await completed('Anterior', 35);
    await completed('Fuera de ambas ventanas', 65);
    const stats = await request(ctx.app.getHttpServer())
      .get('/workouts/stats')
      .set(bearer(token))
      .expect(200);
    expect(stats.body.periodComparison).toMatchObject({
      days: 30,
      current: { workouts: 2, trainingDays: 2, volumeKg: 1000 },
      previous: { workouts: 1, trainingDays: 1, volumeKg: 500 },
      change: {
        workouts: { absolute: 1, percent: 100 },
        trainingDays: { absolute: 1, percent: 100 },
        volumeKg: { absolute: 500, percent: 100 },
      },
    });
  });

  async function completed(name: string, ago: number) {
    const workout = await createWorkout(ctx.app, token, workoutDraft(name));
    const response = await completeWorkout(
      ctx.app,
      token,
      workout.id,
      oneSet(workout.exercises[0].id, {
        setNumber: 1,
        reps: 5,
        loadValue: 100,
        loadUnit: 'KILOGRAM',
      }),
      daysAgo(ago),
    ).expect(201);
    return response.body;
  }
});
