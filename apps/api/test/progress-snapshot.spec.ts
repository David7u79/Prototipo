import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProgressSnapshotService } from '../src/ai/progress-snapshot.service.js';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { bearer, registerUser, seedTestMovements } from './helpers.js';
import { completeWorkout, createWorkout, oneSet, workoutDraft } from './helpers.js';

describe('ProgressSnapshotService', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
  });
  afterAll(async () => ctx.app.close());

  it('resume perfil y marcas con valores deterministas', async () => {
    const token = await registerUser(ctx.app);
    const server = ctx.app.getHttpServer();
    await request(server)
      .put('/profile')
      .set(bearer(token))
      .send({
        displayName: 'Ana',
        experienceLevel: 'ADVANCED',
        primaryGoal: 'STRENGTH',
        birthDate: '2000-06-01',
        trainingSince: '2020-06-01',
      })
      .expect(200);
    const record = (movementSlug: string, recordType: string, value: number, date: string) =>
      request(server)
        .post('/records')
        .set(bearer(token))
        .send({
          movementSlug,
          recordType,
          value,
          unit: recordType === 'WEIGHT' ? 'KILOGRAM' : 'REPETITION',
          repetitions: recordType === 'WEIGHT' ? 1 : null,
          performedAt: date,
        })
        .expect(201);
    await record('barbell-full-squat', 'WEIGHT', 100, '2026-01-10');
    await record('barbell-full-squat', 'WEIGHT', 110, '2026-03-10');
    await record('pull-up', 'REPS', 12, '2026-02-10');

    const { id: userId } = (await request(server).get('/auth/me').set(bearer(token))).body;
    const snapshot = await ctx.app
      .get(ProgressSnapshotService)
      .build(userId, new Date('2026-07-01T12:00:00Z'));

    expect(snapshot.athlete).toEqual({
      experienceLevel: 'ADVANCED',
      primaryGoal: 'STRENGTH',
      preferredUnits: 'METRIC',
      ageYears: 26,
      trainingYears: 6,
    });
    expect(snapshot.totals).toEqual({
      movementsWithRecords: 2,
      records: 3,
      completedWorkouts: 0,
    });
    const squat = snapshot.records.find((item) => item.movementSlug === 'barbell-full-squat');
    expect(squat).toMatchObject({
      recordType: 'WEIGHT',
      canonicalUnit: 'KILOGRAM',
      lowerIsBetter: false,
      entries: 2,
      best: { value: 110, performedAt: '2026-03-10' },
      absoluteProgress: 10,
      percentProgress: 10,
    });
  });

  it('funciona sin perfil ni marcas', async () => {
    await registerUser(ctx.app);
    const user = await ctx.prisma.user.findFirstOrThrow();
    const snapshot = await ctx.app.get(ProgressSnapshotService).build(user.id);
    expect(snapshot.athlete.preferredUnits).toBe('METRIC');
    expect(snapshot.totals).toEqual({
      movementsWithRecords: 0,
      records: 0,
      completedWorkouts: 0,
    });
    expect(snapshot.records).toEqual([]);
  });

  it('incluye entrenamientos, score, volumen y tendencias de fase 3', async () => {
    const token = await registerUser(ctx.app);
    const server = ctx.app.getHttpServer();
    const user = (await request(server).get('/auth/me').set(bearer(token))).body;
    const forTime = await createWorkout(ctx.app, token, workoutDraft('Fran', 'FOR_TIME', 'run'));
    await completeWorkout(
      ctx.app,
      token,
      forTime.id,
      oneSet(
        forTime.exercises[0].id,
        { setNumber: 1, reps: 1, loadValue: 100, loadUnit: 'KILOGRAM' },
        { timeSeconds: 330 },
      ),
      '2026-06-30',
    ).expect(201);
    const strength = await createWorkout(ctx.app, token, workoutDraft('Sentadilla'));
    await completeWorkout(
      ctx.app,
      token,
      strength.id,
      oneSet(strength.exercises[0].id, {
        setNumber: 1,
        reps: 5,
        loadValue: 100,
        loadUnit: 'KILOGRAM',
      }),
      '2026-06-20',
    ).expect(201);
    const snapshot = await ctx.app
      .get(ProgressSnapshotService)
      .build(user.id, new Date('2026-07-01T12:00:00Z'));
    expect(snapshot.totals.completedWorkouts).toBe(2);
    expect(snapshot.recentWorkouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Fran', score: '5:30' }),
        expect.objectContaining({ name: 'Sentadilla', volumeKg: 500 }),
      ]),
    );
    expect(snapshot.volumeByMovementLast30Days).toEqual([
      { movementSlug: 'barbell-full-squat', movementName: 'Barbell full squat', volumeKg: 500 },
      { movementSlug: 'run', movementName: 'Run', volumeKg: 100 },
    ]);
    expect(snapshot.trends).toMatchObject({
      workoutsLast7Days: 1,
      workoutsLast30Days: 2,
      personalRecordsFromWorkoutsLast30Days: 1,
    });
  });
});
