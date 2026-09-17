import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { bearer, daysAgo, registerUser, seedTestMovements } from './helpers.js';

describe('aislamiento de marcas entre usuarios', () => {
  let ctx: TestApp;
  let alice: string;
  let bob: string;
  let aliceRecordId: string;

  const server = () => ctx.app.getHttpServer();

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
    alice = await registerUser(ctx.app, 'Alice');
    bob = await registerUser(ctx.app, 'Bob');
    const created = await request(server())
      .post('/records')
      .set(bearer(alice))
      .send({
        movementSlug: 'barbell-full-squat',
        recordType: 'WEIGHT',
        value: 120,
        unit: 'KILOGRAM',
        repetitions: 1,
        performedAt: daysAgo(3),
      })
      .expect(201);
    aliceRecordId = created.body.id;
  });
  afterAll(async () => ctx.app.close());

  it('otro usuario no ve las marcas en overview, summary ni historial', async () => {
    expect((await request(server()).get('/records').set(bearer(bob))).body.items).toEqual([]);
    expect(
      (await request(server()).get('/records/summary').set(bearer(bob))).body.totalRecords,
    ).toBe(0);
    const history = await request(server()).get('/records/barbell-full-squat').set(bearer(bob));
    expect(history.body.series).toEqual([]);
  });

  it('otro usuario recibe 404 al corregir o retirar una marca ajena y ésta no cambia', async () => {
    const patch = await request(server())
      .patch(`/records/${aliceRecordId}`)
      .set(bearer(bob))
      .send({ value: 1, unit: 'KILOGRAM' });
    expect(patch.status).toBe(404);
    expect(patch.body.code).toBe('RECORD_NOT_FOUND');

    const remove = await request(server()).delete(`/records/${aliceRecordId}`).set(bearer(bob));
    expect(remove.status).toBe(404);

    const row = await ctx.prisma.personalRecord.findUniqueOrThrow({ where: { id: aliceRecordId } });
    expect(Number(row.value)).toBe(120);
    expect(row.deletedAt).toBeNull();
  });

  it('la dueña sigue viendo su marca intacta', async () => {
    const response = await request(server()).get('/records/summary').set(bearer(alice));
    expect(response.body).toMatchObject({ totalRecords: 1, latestRecord: { value: 120 } });
  });
});
