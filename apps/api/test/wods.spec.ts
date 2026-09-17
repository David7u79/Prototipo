import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { bearer, registerUser, seedTestMovements } from './helpers.js';

describe('WODs', () => {
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
    const movement = await ctx.prisma.movement.findUniqueOrThrow({ where: { slug: 'run' } });
    await ctx.prisma.wod.create({
      data: {
        slug: 'fran-controlado',
        name: 'Fran controlado',
        workoutType: 'FOR_TIME',
        repScheme: [21, 15, 9],
        isBenchmark: true,
        source: 'test',
        exercises: { create: { movementId: movement.id, position: 1, reps: 21 } },
      },
    });
  });
  afterAll(async () => ctx.app.close());

  it('lista benchmarks antes que WODs personales y filtra sus atributos', async () => {
    const personal = await create({ name: 'Mi carrera', workoutType: 'CARDIO' });
    const listed = await request(server()).get('/wods').set(bearer(token)).expect(200);
    expect(listed.body.items[0]).toMatchObject({ isBenchmark: true, isPersonal: false });
    expect(listed.body.items.some((item: { slug: string }) => item.slug === personal.slug)).toBe(
      true,
    );
    const filtered = await request(server())
      .get('/wods?workoutType=CARDIO&benchmark=false')
      .set(bearer(token))
      .expect(200);
    expect(filtered.body.items).toEqual([expect.objectContaining({ slug: personal.slug })]);
  });

  it('crea WOD privado, lo aísla y devuelve 404 a otro atleta', async () => {
    const personal = await create({ name: 'WOD Ágil', workoutType: 'CARDIO' });
    expect(personal).toMatchObject({ isPersonal: true, slug: expect.stringMatching(/^wod-agil-/) });
    const other = await registerUser(ctx.app, 'Otro');
    const listed = await request(server()).get('/wods').set(bearer(other)).expect(200);
    expect(listed.body.items.some((item: { slug: string }) => item.slug === personal.slug)).toBe(
      false,
    );
    const missing = await request(server())
      .get(`/wods/${personal.slug}`)
      .set(bearer(other))
      .expect(404);
    expect(missing.body.code).toBe('WOD_NOT_FOUND');
  });

  it('valida prescripción, movimientos y autenticación', async () => {
    await request(server()).get('/wods').expect(401);
    const noDuration = await request(server())
      .post('/wods')
      .set(bearer(token))
      .send({
        ...payload({ workoutType: 'AMRAP' }),
        durationSeconds: null,
      })
      .expect(400);
    expect(noDuration.body.code).toBe('VALIDATION_FAILED');
    const missing = await request(server())
      .post('/wods')
      .set(bearer(token))
      .send(
        payload({
          exercises: [{ ...exercise(), movementSlug: 'missing' }],
        }),
      )
      .expect(404);
    expect(missing.body.code).toBe('MOVEMENT_NOT_FOUND');
  });

  async function create(overrides: Record<string, unknown>) {
    const response = await request(server())
      .post('/wods')
      .set(bearer(token))
      .send(payload(overrides));
    expect(response.status).toBe(201);
    return response.body;
  }
});

function exercise() {
  return {
    movementSlug: 'run',
    reps: null,
    loadValue: null,
    loadUnit: null,
    distanceValue: 5,
    distanceUnit: 'KILOMETER',
    durationSeconds: null,
    notes: null,
  };
}
function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Mi WOD',
    description: null,
    workoutType: 'CARDIO',
    durationSeconds: null,
    rounds: null,
    intervalSeconds: null,
    repScheme: [],
    exercises: [exercise()],
    ...overrides,
  };
}
