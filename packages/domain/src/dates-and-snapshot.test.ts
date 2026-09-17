import { describe, expect, it } from 'vitest';
import { ageInYears, isNotInFuture, isValidIsoDate, todayIsoDate } from './dates.js';
import { buildProgressSnapshot } from './progress-snapshot.js';
import type { RecordEntry } from './records.js';
import { RECORD_LIMITS, RECORD_TYPES, SLUG_PATTERN, UNITS_BY_RECORD_TYPE } from './rules.js';

const NOW = new Date('2026-07-01T12:00:00Z');

describe('fechas', () => {
  it('valida fechas de calendario reales', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-2-3')).toBe(false);
    expect(isValidIsoDate('2026-01-10T00:00:00Z')).toBe(false);
  });

  it('admite hoy y mañana (margen de zona horaria) pero no pasado mañana', () => {
    expect(todayIsoDate(NOW)).toBe('2026-07-01');
    expect(isNotInFuture('2026-07-01', NOW)).toBe(true);
    expect(isNotInFuture('2026-07-02', NOW)).toBe(true);
    expect(isNotInFuture('2026-07-03', NOW)).toBe(false);
  });

  it('calcula la edad antes y después del cumpleaños', () => {
    expect(ageInYears('2000-07-01', NOW)).toBe(26);
    expect(ageInYears('2000-07-02', NOW)).toBe(25);
  });
});

describe('reglas', () => {
  it('cada tipo de marca tiene unidades y límites coherentes', () => {
    for (const type of RECORD_TYPES) {
      expect(UNITS_BY_RECORD_TYPE[type].length, type).toBeGreaterThan(0);
      expect(RECORD_LIMITS[type].min, type).toBeLessThan(RECORD_LIMITS[type].max);
    }
  });

  it('el patrón de slug acepta kebab-case en minúsculas', () => {
    expect(SLUG_PATTERN.test('barbell-full-squat')).toBe(true);
    for (const slug of ['Barbell', '-a', 'a--b', 'a_b', 'a-']) {
      expect(SLUG_PATTERN.test(slug), slug).toBe(false);
    }
  });
});

describe('buildProgressSnapshot', () => {
  const entries = (values: [number, string][]): RecordEntry[] =>
    values.map(([value, performedAt], index) => ({
      id: `e${index}`,
      recordType: 'WEIGHT',
      value,
      unit: 'KILOGRAM',
      normalizedValue: value,
      repetitions: 1,
      distanceMeters: null,
      performedAt,
      createdAt: `${performedAt}T00:00:00.000Z`,
    }));

  it('resume perfil, totales y progreso por serie', () => {
    const snapshot = buildProgressSnapshot(
      {
        experienceLevel: 'INTERMEDIATE',
        primaryGoal: 'STRENGTH',
        preferredUnits: 'IMPERIAL',
        birthDate: '2000-07-02',
        trainingSince: '2020-01-01',
      },
      [
        {
          movementSlug: 'barbell-full-squat',
          movementName: 'Barbell full squat',
          entries: entries([
            [100, '2026-01-01'],
            [120, '2026-03-01'],
          ]),
        },
        { movementSlug: 'pull-up', movementName: 'Pull-up', entries: [] },
      ],
      NOW,
    );

    expect(snapshot.generatedAt).toBe(NOW.toISOString());
    expect(snapshot.athlete).toEqual({
      experienceLevel: 'INTERMEDIATE',
      primaryGoal: 'STRENGTH',
      preferredUnits: 'IMPERIAL',
      ageYears: 25,
      trainingYears: 6,
    });
    expect(snapshot.totals).toEqual({
      movementsWithRecords: 1,
      records: 2,
      completedWorkouts: 0,
    });
    expect(snapshot.records).toEqual([
      {
        movementSlug: 'barbell-full-squat',
        movementName: 'Barbell full squat',
        recordType: 'WEIGHT',
        repetitions: 1,
        distanceMeters: null,
        canonicalUnit: 'KILOGRAM',
        lowerIsBetter: false,
        entries: 2,
        first: { value: 100, performedAt: '2026-01-01' },
        current: { value: 120, performedAt: '2026-03-01' },
        best: { value: 120, performedAt: '2026-03-01' },
        absoluteProgress: 20,
        percentProgress: 20,
        recentHistory: [
          { value: 100, performedAt: '2026-01-01', isPersonalBest: true },
          { value: 120, performedAt: '2026-03-01', isPersonalBest: true },
        ],
      },
    ]);
  });

  it('sin perfil usa nulls y sistema métrico', () => {
    const snapshot = buildProgressSnapshot(null, [], NOW);
    expect(snapshot.athlete).toEqual({
      experienceLevel: null,
      primaryGoal: null,
      preferredUnits: 'METRIC',
      ageYears: null,
      trainingYears: null,
    });
    expect(snapshot.records).toEqual([]);
  });

  it('ordena y limita entrenamientos, agrega volumen y cuenta marcas de WORKOUT', () => {
    const workouts = Array.from({ length: 11 }, (_, index) => ({
      performedOn: `2026-06-${String(index + 20).padStart(2, '0')}`,
      workoutType: 'STRENGTH' as const,
      name: `W${index}`,
      score: {
        timeSeconds: null,
        repsAtTimeCap: null,
        rounds: null,
        extraReps: null,
        completed: null,
      },
      personalRecords: 0,
      exercises: [
        {
          movementSlug: 'squat',
          movementName: 'Squat',
          sets: [{ reps: 5, loadKg: 100, distanceMeters: null, durationSeconds: null }],
        },
      ],
    }));
    const snapshot = buildProgressSnapshot(
      null,
      [
        {
          movementSlug: 'squat',
          movementName: 'Squat',
          entries: [{ ...entries([[100, '2026-07-01']])[0]!, source: 'WORKOUT' }],
        },
      ],
      NOW,
      workouts,
    );
    expect(snapshot.recentWorkouts).toHaveLength(10);
    expect(snapshot.recentWorkouts[0]?.name).toBe('W10');
    expect(snapshot.recentWorkouts[0]?.volumeKg).toBe(500);
    expect(snapshot.volumeByMovementLast30Days).toEqual([
      { movementSlug: 'squat', movementName: 'Squat', volumeKg: 5500 },
    ]);
    expect(snapshot.trends).toMatchObject({
      workoutsLast7Days: 6,
      workoutsLast30Days: 11,
      personalRecordsFromWorkoutsLast30Days: 1,
    });
  });
});
