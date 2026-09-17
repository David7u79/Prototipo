import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { bearer, registerUser, seedTestMovements } from './helpers.js';

describe('workouts smoke', () => {
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

  it('completa fuerza y crea una marca derivada con origen', async () => {
    const workout = await strengthWorkout();
    const response = await complete(workout.id, workout.exercises[0]!.id).expect(201);
    expect(response.body.status).toBe('COMPLETED');
    const records = await request(ctx.app.getHttpServer())
      .get('/records')
      .set(bearer(token))
      .expect(200);
    expect(records.body.items[0].series.current).toMatchObject({ source: 'WORKOUT' });
  });

  it('completar dos veces en paralelo crea una sola marca', async () => {
    const workout = await strengthWorkout();
    const results = await Promise.all([
      complete(workout.id, workout.exercises[0]!.id),
      complete(workout.id, workout.exercises[0]!.id),
    ]);
    expect(results.map((response) => response.status)).toEqual([201, 201]);
    expect(
      await ctx.prisma.personalRecord.count({ where: { source: 'WORKOUT', deletedAt: null } }),
    ).toBe(1);
  });

  it('no completa FOR_TIME sin score', async () => {
    const workout = await request(ctx.app.getHttpServer())
      .post('/workouts')
      .set(bearer(token))
      .send(workoutDraft('Sin tiempo', 'FOR_TIME', 'run'))
      .expect(201);
    const response = await request(ctx.app.getHttpServer())
      .post(`/workouts/${workout.body.id}/complete`)
      .set(bearer(token))
      .send({})
      .expect(422);
    expect(response.body.code).toBe('WORKOUT_INCOMPLETE');
  });

  async function strengthWorkout() {
    const response = await request(ctx.app.getHttpServer())
      .post('/workouts')
      .set(bearer(token))
      .send(workoutDraft('Sentadilla', 'STRENGTH', 'barbell-full-squat'))
      .expect(201);
    return response.body;
  }
  function complete(workoutId: string, exerciseId: string) {
    return request(ctx.app.getHttpServer())
      .post(`/workouts/${workoutId}/complete`)
      .set(bearer(token))
      .send({
        results: {
          score: null,
          exercises: [
            {
              exerciseId,
              sets: [
                {
                  setNumber: 1,
                  reps: 1,
                  loadValue: 100,
                  loadUnit: 'KILOGRAM',
                },
              ],
            },
          ],
        },
      });
  }
});

function workoutDraft(name: string, workoutType: 'STRENGTH' | 'FOR_TIME', movementSlug: string) {
  return {
    name,
    workoutType,
    description: null,
    notes: null,
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
    exercises: [
      {
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
      },
    ],
  };
}
