import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { bearer, daysAgo, registerUser, seedTestMovements } from './helpers.js';

describe('marcas personales', () => {
  let ctx: TestApp;
  let token: string;

  const server = () => ctx.app.getHttpServer();
  const post = (body: object, auth = token) =>
    request(server()).post('/records').set(bearer(auth)).send(body);
  const get = (path: string, auth = token) => request(server()).get(path).set(bearer(auth));
  const weight = (value: number, performedAt: string, extra: object = {}) => ({
    movementSlug: 'barbell-full-squat',
    recordType: 'WEIGHT',
    value,
    unit: 'KILOGRAM',
    repetitions: 1,
    performedAt,
    ...extra,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
    token = await registerUser(ctx.app);
  });
  afterAll(async () => ctx.app.close());

  it('exige autenticación en todos los endpoints', async () => {
    const id = '01a0ac92-5285-72ee-8b8b-65600949e5cf';
    await request(server()).get('/records').expect(401);
    await request(server()).get('/records/summary').expect(401);
    await request(server()).get('/records/barbell-full-squat').expect(401);
    await request(server())
      .post('/records')
      .send(weight(100, daysAgo(1)))
      .expect(401);
    await request(server()).patch(`/records/${id}`).send({ notes: 'x' }).expect(401);
    await request(server()).delete(`/records/${id}`).expect(401);
  });

  describe('POST /records', () => {
    it('registra una marca de peso en kg', async () => {
      const response = await post(weight(100.5, daysAgo(3), { notes: '  Buena técnica  ' }));
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        movement: { slug: 'barbell-full-squat', name: 'Barbell full squat' },
        recordType: 'WEIGHT',
        value: 100.5,
        unit: 'KILOGRAM',
        normalizedValue: 100.5,
        repetitions: 1,
        performedAt: daysAgo(3),
        notes: 'Buena técnica',
        source: 'MANUAL',
      });
    });

    it('convierte libras a kg en normalizedValue y conserva el valor introducido', async () => {
      const response = await post(weight(225, daysAgo(1), { unit: 'POUND' })).expect(201);
      expect(response.body).toMatchObject({ value: 225, unit: 'POUND', normalizedValue: 102.058 });
    });

    it('registra repeticiones, duración y tiempo', async () => {
      const reps = await post({
        movementSlug: 'pull-up',
        recordType: 'REPS',
        value: 18,
        unit: 'REPETITION',
        performedAt: daysAgo(1),
      });
      expect(reps.status).toBe(201);
      expect(reps.body).toMatchObject({ normalizedValue: 18, repetitions: null });

      const plank = await post({
        movementSlug: 'front-plank',
        recordType: 'DURATION',
        value: 95,
        unit: 'SECOND',
        performedAt: daysAgo(1),
      });
      expect(plank.status).toBe(201);

      const run = await post({
        movementSlug: 'run',
        recordType: 'TIME',
        value: 1500,
        unit: 'SECOND',
        distanceValue: 5,
        distanceUnit: 'KILOMETER',
        performedAt: daysAgo(1),
      });
      expect(run.status).toBe(201);
      expect(run.body).toMatchObject({ recordType: 'TIME', normalizedValue: 1500 });
    });

    it('registra distancia en km como metros', async () => {
      const response = await post({
        movementSlug: 'run',
        recordType: 'DISTANCE',
        value: 5.25,
        unit: 'KILOMETER',
        performedAt: daysAgo(1),
      }).expect(201);
      expect(response.body.normalizedValue).toBe(5250);
    });

    it('rechaza una unidad que no corresponde al tipo', async () => {
      const response = await post(weight(100, daysAgo(1), { unit: 'SECOND' })).expect(400);
      expect(response.body.code).toBe('INVALID_RECORD_VALUE');
    });

    it('rechaza valores no positivos, con más de 3 decimales o fuera de límites', async () => {
      for (const value of [0, -5, 100.1234]) {
        const response = await post(weight(value, daysAgo(1)));
        expect(response.status, String(value)).toBe(400);
        expect(response.body.code, String(value)).toBe('VALIDATION_FAILED');
      }
      const tooHeavy = await post(weight(1001, daysAgo(1))).expect(400);
      expect(tooHeavy.body.code).toBe('INVALID_RECORD_VALUE');
    });

    it('rechaza un tipo de marca que el movimiento no admite', async () => {
      const response = await post({
        movementSlug: 'pull-up',
        recordType: 'WEIGHT',
        value: 20,
        unit: 'KILOGRAM',
        repetitions: 1,
        performedAt: daysAgo(1),
      }).expect(400);
      expect(response.body.code).toBe('RECORD_TYPE_NOT_ALLOWED');
    });

    it('responde 404 para un movimiento inexistente o inactivo', async () => {
      for (const movementSlug of ['no-existe', 'retired-movement']) {
        const response = await post(weight(100, daysAgo(1), { movementSlug }));
        expect(response.status).toBe(404);
        expect(response.body.code).toBe('MOVEMENT_NOT_FOUND');
      }
    });

    it('exige repeticiones en peso y las prohíbe en otros tipos', async () => {
      await post(weight(100, daysAgo(1), { repetitions: null })).expect(400);
      await post({
        movementSlug: 'pull-up',
        recordType: 'REPS',
        value: 10,
        unit: 'REPETITION',
        repetitions: 3,
        performedAt: daysAgo(1),
      }).expect(400);
    });

    it('rechaza fechas futuras, inexistentes o con hora', async () => {
      const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
      for (const performedAt of [future, '2026-02-30', '2026-01-10T10:00:00Z', '1899-12-31']) {
        const response = await post(weight(100, performedAt));
        expect(response.status, performedAt).toBe(400);
      }
    });

    it('rechaza campos que fija el servidor (mass assignment)', async () => {
      for (const extra of [
        { userId: '01a0ac92-5285-72ee-8b8b-65600949e5cf' },
        { normalizedValue: 999 },
        { source: 'WORKOUT' },
      ]) {
        const response = await post(weight(100, daysAgo(1), extra));
        expect(response.status, JSON.stringify(extra)).toBe(400);
      }
    });
  });

  describe('historial y progreso', () => {
    it('ordena cronológicamente y calcula mejor, actual y cambios exactos', async () => {
      await post(weight(105, daysAgo(10))).expect(201);
      await post(weight(90, daysAgo(120))).expect(201);
      await post(weight(100, daysAgo(60))).expect(201);

      const response = await get('/records/barbell-full-squat').expect(200);
      expect(response.body.movement).toMatchObject({ slug: 'barbell-full-squat' });
      expect(response.body.series).toHaveLength(1);
      const [series] = response.body.series;
      expect(series).toMatchObject({
        key: 'WEIGHT:1',
        recordType: 'WEIGHT',
        repetitions: 1,
        lowerIsBetter: false,
        count: 3,
        first: { value: 90 },
        current: { value: 105 },
        best: { value: 105, isPersonalBest: true },
        changeFromPrevious: { absolute: 5, percent: 5, improved: true },
        bestImprovement: { absolute: 5, percent: 5, improved: true },
        totalProgress: { absolute: 15, percent: 16.7, improved: true },
      });
      expect(series.history.map((entry: { value: number }) => entry.value)).toEqual([90, 100, 105]);
      expect(
        series.history.map((entry: { isPersonalBest: boolean }) => entry.isPersonalBest),
      ).toEqual([true, true, true]);
    });

    it('detecta una regresión sin perder la mejor marca', async () => {
      await post(weight(110, daysAgo(30))).expect(201);
      await post(weight(100, daysAgo(5))).expect(201);
      const [series] = (await get('/records/barbell-full-squat')).body.series;
      expect(series.best.value).toBe(110);
      expect(series.current.value).toBe(100);
      expect(series.changeFromPrevious).toEqual({ absolute: -10, percent: -9.1, improved: false });
      expect(series.bestImprovement).toBeNull();
    });

    it('separa series por repeticiones (1RM y 5RM)', async () => {
      await post(weight(120, daysAgo(20))).expect(201);
      await post(weight(100, daysAgo(10), { repetitions: 5 })).expect(201);
      const { series } = (await get('/records/barbell-full-squat')).body;
      expect(series.map((item: { key: string }) => item.key)).toEqual(['WEIGHT:1', 'WEIGHT:5']);
    });

    it('en TIME considera mejor el menor tiempo', async () => {
      const run = (value: number, performedAt: string) => ({
        movementSlug: 'run',
        recordType: 'TIME',
        value,
        unit: 'SECOND',
        distanceValue: 5,
        distanceUnit: 'KILOMETER',
        performedAt,
      });
      await post(run(1600, daysAgo(40))).expect(201);
      await post(run(1500, daysAgo(20))).expect(201);
      const [series] = (await get('/records/run')).body.series;
      expect(series).toMatchObject({
        lowerIsBetter: true,
        best: { value: 1500 },
        changeFromPrevious: { absolute: -100, improved: true },
      });
    });

    it('devuelve series vacías si el atleta no tiene marcas en el movimiento', async () => {
      const response = await get('/records/pull-up').expect(200);
      expect(response.body.series).toEqual([]);
    });

    it('valida el slug del historial', async () => {
      expect((await get('/records/no-existe')).body.code).toBe('MOVEMENT_NOT_FOUND');
      expect((await get('/records/Mal_Slug')).status).toBe(400);
    });
  });

  describe('PATCH /records/:id', () => {
    it('corrige valor y unidad recalculando normalizedValue', async () => {
      const created = await post(weight(100, daysAgo(5))).expect(201);
      const response = await request(server())
        .patch(`/records/${created.body.id}`)
        .set(bearer(token))
        .send({ value: 200, unit: 'POUND', notes: 'Corregido' })
        .expect(200);
      expect(response.body).toMatchObject({
        value: 200,
        unit: 'POUND',
        normalizedValue: 90.718,
        notes: 'Corregido',
        recordType: 'WEIGHT',
      });
    });

    it('aplica las reglas del tipo existente y exige valor y unidad juntos', async () => {
      const created = await post(weight(100, daysAgo(5))).expect(201);
      const patch = (body: object) =>
        request(server()).patch(`/records/${created.body.id}`).set(bearer(token)).send(body);
      expect((await patch({ value: 90 })).status).toBe(400);
      expect((await patch({ value: 90, unit: 'SECOND' })).body.code).toBe('INVALID_RECORD_VALUE');
      expect((await patch({ repetitions: null })).status).toBe(400);
      expect((await patch({ recordType: 'REPS' })).status).toBe(400);
      expect((await patch({})).status).toBe(400);
    });

    it('responde 400 ante un id que no es UUID', async () => {
      await request(server())
        .patch('/records/abc')
        .set(bearer(token))
        .send({ notes: 'x' })
        .expect(400);
    });
  });

  describe('DELETE /records/:id (borrado lógico)', () => {
    it('retira la marca de historial, overview y summary pero conserva la fila', async () => {
      await post(weight(90, daysAgo(30))).expect(201);
      const created = await post(weight(100, daysAgo(5))).expect(201);

      await request(server()).delete(`/records/${created.body.id}`).set(bearer(token)).expect(204);

      const [series] = (await get('/records/barbell-full-squat')).body.series;
      expect(series.count).toBe(1);
      expect(series.best.value).toBe(90);
      expect((await get('/records/summary')).body.totalRecords).toBe(1);
      expect((await get('/records')).body.items[0].series.count).toBe(1);

      const row = await ctx.prisma.personalRecord.findUniqueOrThrow({
        where: { id: created.body.id },
      });
      expect(row.deletedAt).not.toBeNull();

      await request(server()).delete(`/records/${created.body.id}`).set(bearer(token)).expect(404);
    });
  });

  describe('GET /records y GET /records/summary', () => {
    it('devuelve vacíos sin marcas', async () => {
      expect((await get('/records')).body).toEqual({ items: [] });
      expect((await get('/records/summary')).body).toEqual({
        movementsWithRecords: 0,
        totalRecords: 0,
        latestRecord: null,
        recentImprovement: null,
        recentRecords: [],
      });
    });

    it('resume series por actividad reciente y la mejora más reciente', async () => {
      await post(weight(100, daysAgo(60))).expect(201);
      await post(weight(110, daysAgo(40))).expect(201);
      await post({
        ...weight(150, daysAgo(50)),
        movementSlug: 'barbell-deadlift',
      }).expect(201);
      await post({
        movementSlug: 'pull-up',
        recordType: 'REPS',
        value: 12,
        unit: 'REPETITION',
        performedAt: daysAgo(2),
      }).expect(201);

      const overview = (await get('/records')).body;
      expect(
        overview.items.map((item: { movement: { slug: string } }) => item.movement.slug),
      ).toEqual(['pull-up', 'barbell-full-squat', 'barbell-deadlift']);
      expect(overview.items[1].series).toMatchObject({
        best: { value: 110 },
        bestImprovement: { absolute: 10, percent: 10, improved: true },
      });
      expect(overview.items[1].series).not.toHaveProperty('history');

      const summary = (await get('/records/summary')).body;
      expect(summary).toMatchObject({
        movementsWithRecords: 3,
        totalRecords: 4,
        latestRecord: { movement: { slug: 'pull-up' }, value: 12 },
        recentImprovement: {
          record: { movement: { slug: 'barbell-full-squat' }, value: 110 },
          improvement: { absolute: 10, percent: 10, improved: true },
        },
      });
      expect(summary.recentRecords).toHaveLength(4);
    });

    it('limita recentRecords a 5', async () => {
      for (let day = 1; day <= 7; day += 1) {
        await post(weight(80 + day, daysAgo(day))).expect(201);
      }
      const summary = (await get('/records/summary')).body;
      expect(summary.recentRecords).toHaveLength(5);
      expect(summary.recentRecords[0].value).toBe(81);
    });
  });
});
