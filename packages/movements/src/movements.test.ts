import { RECORD_TYPES, SLUG_PATTERN } from '@garfit/domain';
import catalogJson from '../data/catalog.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { recordTypesFor } from './record-types.js';
import {
  type CatalogMovement,
  slugify,
  SOURCE,
  type SourceExercise,
  transformSource,
} from './source-transform.js';
import { EQUIPMENT, MOVEMENT_CATEGORIES, MUSCLE_GROUPS } from './taxonomy.js';

function exercise(overrides: Partial<SourceExercise> & Pick<SourceExercise, 'id' | 'name'>) {
  return {
    body_part: 'upper legs',
    equipment: 'barbell',
    target: 'glutes',
    secondary_muscles: ['quadriceps'],
    instruction_steps: { es: ['Paso uno.'], en: ['Step one.'] },
    ...overrides,
  } satisfies SourceExercise;
}

describe('recordTypesFor', () => {
  it('aplica las reglas explícitas por categoría, equipamiento y nombre', () => {
    const base = { name: 'Movement', category: 'UPPER_LEGS', equipment: 'BARBELL' } as const;
    expect(recordTypesFor(base)).toEqual(['WEIGHT', 'REPS']);
    expect(recordTypesFor({ ...base, equipment: 'BODY_WEIGHT' })).toEqual(['REPS']);
    expect(recordTypesFor({ ...base, category: 'CARDIO', equipment: 'BODY_WEIGHT' })).toEqual([
      'REPS',
      'DISTANCE',
      'DURATION',
      'TIME',
    ]);
    expect(recordTypesFor({ ...base, equipment: 'STATIONARY_BIKE' })).toContain('DISTANCE');
    expect(
      recordTypesFor({ name: 'Front plank', category: 'WAIST', equipment: 'BODY_WEIGHT' }),
    ).toEqual(['REPS', 'DURATION']);
  });
});

describe('transformSource', () => {
  it('mapea categoría, equipamiento y sinónimos de músculos', () => {
    const [movement] = transformSource([
      exercise({
        id: '0001',
        name: 'barbell squat',
        target: 'quads',
        secondary_muscles: ['delts', 'deltoids', 'quads', 'lower back'],
      }),
    ]);
    expect(movement).toEqual<CatalogMovement>({
      slug: 'barbell-squat',
      sourceId: '0001',
      name: 'Barbell squat',
      category: 'UPPER_LEGS',
      equipment: 'BARBELL',
      primaryMuscles: ['QUADRICEPS'],
      secondaryMuscles: ['SHOULDERS', 'LOWER_BACK'],
      instructions: ['Paso uno.'],
      recordTypes: ['WEIGHT', 'REPS'],
    });
  });

  it('descarta variantes de cámara, repara codificación y desambigua nombres repetidos', () => {
    const movements = transformSource([
      exercise({ id: '0003', name: 'lever chest press' }),
      exercise({ id: '0002', name: 'sled 45в° leg press (side pov)' }),
      exercise({ id: '0001', name: 'sled 45в° leg press' }),
      exercise({ id: '0004', name: 'lever chest press' }),
    ]);
    expect(movements.map((movement) => [movement.slug, movement.name])).toEqual([
      ['sled-45-leg-press', 'Sled 45° leg press'],
      ['lever-chest-press', 'Lever chest press'],
      ['lever-chest-press-0004', 'Lever chest press'],
    ]);
  });

  it('lanza con el id del ejercicio ante un valor sin mapeo', () => {
    expect(() =>
      transformSource([exercise({ id: '0099', name: 'x', equipment: 'jetpack' })]),
    ).toThrow(/0099/);
  });

  it('slugify elimina acentos y símbolos', () => {
    expect(slugify('Sentadilla búlgara (con mancuerna)')).toBe('sentadilla-bulgara-con-mancuerna');
  });
});

describe('catálogo generado (datos reales)', () => {
  const catalog = catalogJson as unknown as {
    source: typeof SOURCE;
    movements: CatalogMovement[];
  };

  it('corresponde a la fuente fijada y tiene 1319 movimientos con slugs únicos', () => {
    expect(catalog.source.commit).toBe(SOURCE.commit);
    expect(catalog.movements).toHaveLength(1319);
    const slugs = catalog.movements.map((movement) => movement.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => SLUG_PATTERN.test(slug))).toBe(true);
  });

  it('sólo usa valores válidos de la taxonomía y todo movimiento es utilizable', () => {
    for (const movement of catalog.movements) {
      expect(MOVEMENT_CATEGORIES).toContain(movement.category);
      expect(EQUIPMENT).toContain(movement.equipment);
      for (const muscle of [...movement.primaryMuscles, ...movement.secondaryMuscles]) {
        expect(MUSCLE_GROUPS).toContain(muscle);
      }
      expect(movement.recordTypes.every((type) => RECORD_TYPES.includes(type))).toBe(true);
      expect(movement.primaryMuscles.length).toBeGreaterThan(0);
      expect(movement.instructions.length).toBeGreaterThan(0);
      expect(movement.recordTypes.length).toBeGreaterThan(0);
    }
  });

  it('incluye movimientos de referencia con los tipos de marca esperados', () => {
    const bySlug = new Map(catalog.movements.map((movement) => [movement.slug, movement]));
    expect(bySlug.get('barbell-full-squat')?.recordTypes).toContain('WEIGHT');
    expect(bySlug.get('jump-rope')?.recordTypes).toContain('DISTANCE');
  });
});
