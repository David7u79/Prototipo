import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

describe('rendimiento por WOD', () => {
  let ctx: TestApp;
  let token: string;
  let slug: string;
  const server = () => ctx.app.getHttpServer();
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
    token = await registerUser(ctx.app);
    slug = await wod('FOR_TIME', 'fran-rendimiento', 21);
  });
  afterAll(async () => ctx.app.close());

  it('informa cero intentos y permite comparar un benchmark sin ejecuciones', async () => {
    const response = await get(slug);
    expect(response.body.performance).toMatchObject({ attempts: 0, comparisonAvailable: true });
  });

  it('calcula mejor, última y cambio entre intentos FOR_TIME', async () => {
    const first = await attempt(312, 3);
    const one = await get(slug);
    expect(one.body.performance).toMatchObject({
      attempts: 1,
      best: { workoutId: first.id },
      latest: { workoutId: first.id },
      previous: null,
      change: null,
    });
    await attempt(288, 2);
    await attempt(300, 1);
    const response = await get(slug);
    expect(response.body.performance).toMatchObject({
      attempts: 3,
      best: { value: 288 },
      latest: { value: 300 },
      previous: { value: 288 },
      change: { absolute: 12, percent: 4.17, improved: false },
    });
  });

  it('cuenta sólo ejecuciones propias, completadas, no borradas y vinculadas al WOD', async () => {
    await attempt(300, 3);
    const deleted = await attempt(290, 2);
    await request(server()).delete(`/workouts/${deleted.id}`).set(bearer(token)).expect(204);
    const free = await createWorkout(ctx.app, token, workoutDraft('Fran rendimiento', 'FOR_TIME'));
    await completeWorkout(
      ctx.app,
      token,
      free.id,
      oneSet(free.exercises[0].id, { setNumber: 1, reps: 1 }, { timeSeconds: 1 }),
    ).expect(201);
    const other = await registerUser(ctx.app, 'Otro');
    const otherWorkout = await request(server())
      .post('/workouts')
      .set(bearer(other))
      .send({ wodSlug: slug })
      .expect(201);
    await completeWorkout(
      ctx.app,
      other,
      otherWorkout.body.id,
      oneSet(otherWorkout.body.exercises[0].id, { setNumber: 1, reps: 1 }, { timeSeconds: 100 }),
    ).expect(201);
    expect((await get(slug)).body.performance.attempts).toBe(1);
  });

  it('oculta WODs privados y marca AMRAP de esquema desconocido', async () => {
    const owner = token;
    const privateSlug = await wod('FOR_TIME', 'privado-rendimiento', 21, owner);
    const other = await registerUser(ctx.app, 'Otro');
    const hidden = await request(server())
      .get(`/wods/${privateSlug}/performance`)
      .set(bearer(other))
      .expect(404);
    expect(hidden.body.code).toBe('WOD_NOT_FOUND');
    await request(server()).get('/wods/inexistente/performance').set(bearer(token)).expect(404);
    const amrap = await wod('AMRAP', 'amrap-desconocido', null);
    const response = await get(amrap);
    expect(response.body.performance).toMatchObject({
      comparisonAvailable: false,
      unavailableReason: 'ESQUEMA_DESCONOCIDO',
    });
  });

  const get = (value: string) =>
    request(server()).get(`/wods/${value}/performance`).set(bearer(token)).expect(200);
  async function wod(
    type: 'FOR_TIME' | 'AMRAP',
    value: string,
    reps: number | null,
    ownerToken?: string,
  ) {
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: 'pull-up' } });
    const ownerId = ownerToken
      ? (await ctx.prisma.user.findFirstOrThrow({ orderBy: { createdAt: 'desc' } })).id
      : null;
    await ctx.prisma.wod.create({
      data: {
        slug: value,
        name: value,
        ownerId,
        workoutType: type,
        durationSeconds: type === 'AMRAP' ? 600 : null,
        repScheme: reps === null ? [] : [reps],
        exercises: { create: { movementId: movement.id, position: 1, reps } },
      },
    });
    return value;
  }
  async function attempt(timeSeconds: number, ago: number) {
    const workout = await request(server())
      .post('/workouts')
      .set(bearer(token))
      .send({ wodSlug: slug })
      .expect(201);
    return (
      await completeWorkout(
        ctx.app,
        token,
        workout.body.id,
        oneSet(workout.body.exercises[0].id, { setNumber: 1, reps: 1 }, { timeSeconds }),
        daysAgo(ago),
      ).expect(201)
    ).body;
  }
});
