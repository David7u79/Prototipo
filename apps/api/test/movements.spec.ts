import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { seedTestMovements } from './helpers.js';

const SUMMARY_KEYS = [
  'category',
  'difficulty',
  'equipment',
  'id',
  'name',
  'primaryMuscles',
  'recordTypes',
  'secondaryMuscles',
  'slug',
];

describe('catálogo de movimientos', () => {
  let ctx: TestApp;
  const get = (path: string) => request(ctx.app.getHttpServer()).get(path);
  const slugsOf = (body: { items: { slug: string }[] }) => body.items.map((item) => item.slug);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
  });
  afterAll(async () => ctx.app.close());

  describe('GET /movements', () => {
    it('lista sólo movimientos activos, ordenados por nombre, con el contrato MovementSummary', async () => {
      const response = await get('/movements').expect(200);
      expect(response.body).toMatchObject({ page: 1, limit: 20, total: 6, totalPages: 1 });
      expect(slugsOf(response.body)).toEqual([
        'barbell-deadlift',
        'barbell-full-squat',
        'dumbbell-curl',
        'front-plank',
        'pull-up',
        'run',
      ]);
      expect(Object.keys(response.body.items[0]).sort()).toEqual(SUMMARY_KEYS);
    });

    it('pagina con page y limit', async () => {
      const response = await get('/movements?page=2&limit=4').expect(200);
      expect(response.body).toMatchObject({ page: 2, limit: 4, total: 6, totalPages: 2 });
      expect(slugsOf(response.body)).toEqual(['pull-up', 'run']);
    });

    it('devuelve totalPages 0 sin resultados', async () => {
      const response = await get('/movements?search=inexistente').expect(200);
      expect(response.body).toMatchObject({ items: [], total: 0, totalPages: 0 });
    });

    it('busca por nombre sin distinguir mayúsculas', async () => {
      const response = await get('/movements?search=BARBELL').expect(200);
      expect(slugsOf(response.body)).toEqual(['barbell-deadlift', 'barbell-full-squat']);
    });

    it('filtra por categoría, equipamiento, tipo de marca y dificultad', async () => {
      expect(slugsOf((await get('/movements?category=CARDIO')).body)).toEqual(['run']);
      expect(slugsOf((await get('/movements?equipment=DUMBBELL')).body)).toEqual(['dumbbell-curl']);
      expect(slugsOf((await get('/movements?recordType=DURATION')).body)).toEqual([
        'front-plank',
        'run',
      ]);
      expect((await get('/movements?difficulty=BEGINNER')).body.total).toBe(0);
    });

    it('filtra por grupo muscular principal o secundario', async () => {
      expect(slugsOf((await get('/movements?muscleGroup=LATS')).body)).toEqual(['pull-up']);
      expect(slugsOf((await get('/movements?muscleGroup=QUADRICEPS')).body)).toEqual([
        'barbell-full-squat',
        'run',
      ]);
    });

    it('combina filtros con AND', async () => {
      const response = await get('/movements?equipment=BARBELL&muscleGroup=LOWER_BACK');
      expect(slugsOf(response.body)).toEqual(['barbell-deadlift']);
    });

    it('rechaza enums inválidos, límites fuera de rango y parámetros desconocidos', async () => {
      for (const query of [
        'category=LEGS',
        'limit=51',
        'limit=0',
        'page=0',
        'page=abc',
        'orderBy=name',
      ]) {
        const response = await get(`/movements?${query}`);
        expect(response.status, query).toBe(400);
        expect(response.body.code, query).toBe('VALIDATION_FAILED');
      }
    });
  });

  describe('GET /movements/:slug', () => {
    it('devuelve el detalle con instrucciones y fuente', async () => {
      const response = await get('/movements/barbell-full-squat').expect(200);
      expect(response.body).toMatchObject({
        slug: 'barbell-full-squat',
        category: 'UPPER_LEGS',
        difficulty: null,
        description: null,
        instructions: ['Baja con control.', 'Sube empujando con los talones.'],
        source: 'test',
      });
      expect(response.body).not.toHaveProperty('isActive');
    });

    it('responde 404 MOVEMENT_NOT_FOUND si no existe o está inactivo', async () => {
      for (const slug of ['no-existe', 'retired-movement']) {
        const response = await get(`/movements/${slug}`).expect(404);
        expect(response.body.code).toBe('MOVEMENT_NOT_FOUND');
      }
    });

    it('responde 400 ante un slug con formato inválido', async () => {
      const response = await get('/movements/Barbell_Squat').expect(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
    });
  });
});
