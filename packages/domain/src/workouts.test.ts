import { describe, expect, it } from 'vitest';
import {
  countInLastDays,
  countPerWeek,
  formatScore,
  normalizeSet,
  recordCandidates,
  selectNewRecords,
  setVolumeKg,
  summarizeSets,
  totalVolumeKg,
  validatePrescription,
  validateScore,
} from './workouts.js';

const empty = {
  reps: null,
  loadValue: null,
  loadUnit: null,
  distanceValue: null,
  distanceUnit: null,
  durationSeconds: null,
} as const;

describe('prescripciones y series', () => {
  it('valida contratos por tipo e informa los parámetros impropios', () => {
    expect(
      validatePrescription('AMRAP', {
        durationSeconds: 60,
        rounds: null,
        intervalSeconds: null,
        repScheme: [],
      }),
    ).toEqual([]);
    expect(
      validatePrescription('AMRAP', {
        durationSeconds: null,
        rounds: null,
        intervalSeconds: null,
        repScheme: [],
      }),
    ).not.toEqual([]);
    expect(
      validatePrescription('EMOM', {
        durationSeconds: 61,
        rounds: null,
        intervalSeconds: 60,
        repScheme: [],
      }),
    ).not.toEqual([]);
    expect(
      validatePrescription('FOR_TIME', {
        durationSeconds: null,
        rounds: 2,
        intervalSeconds: null,
        repScheme: [1],
      }),
    ).not.toEqual([]);
    for (const type of ['STRENGTH', 'CARDIO'] as const)
      expect(
        validatePrescription(type, {
          durationSeconds: null,
          rounds: 1,
          intervalSeconds: 60,
          repScheme: [],
        }),
      ).not.toEqual([]);
    expect(
      validatePrescription('CUSTOM', {
        durationSeconds: null,
        rounds: null,
        intervalSeconds: 60,
        repScheme: [],
      }),
    ).not.toEqual([]);
  });

  it('canonicaliza libras y kilómetros y detecta series inválidas', () => {
    expect(
      normalizeSet({
        ...empty,
        reps: 5,
        loadValue: 100,
        loadUnit: 'POUND',
        distanceValue: 5,
        distanceUnit: 'KILOMETER',
      }).value,
    ).toMatchObject({ loadKg: 45.359, distanceMeters: 5000 });
    for (const value of [
      { ...empty, loadValue: 1 },
      { ...empty, distanceValue: 1 },
      { ...empty, reps: 1.5 },
      { ...empty, loadValue: 1, loadUnit: 'KILOGRAM' },
      empty,
      { ...empty, reps: 1, loadValue: 1001, loadUnit: 'KILOGRAM' },
    ] as const) {
      expect(normalizeSet(value).errors.length).toBeGreaterThan(0);
    }
  });
});

describe('volumen y score', () => {
  it('suma el volumen real y rechaza entradas negativas o NaN', () => {
    expect(setVolumeKg({ reps: 5, loadKg: 100 })).toBe(500);
    expect(
      totalVolumeKg([
        { reps: 5, loadKg: 100 },
        { reps: 5, loadKg: 100 },
        { reps: 5, loadKg: 100 },
      ]),
    ).toBe(1500);
    expect(totalVolumeKg([{ reps: null, loadKg: null }])).toBe(0);
    expect(() => setVolumeKg({ reps: -1, loadKg: 1 })).toThrow(RangeError);
    expect(() => setVolumeKg({ reps: 1, loadKg: Number.NaN })).toThrow(RangeError);
  });

  it('valida y formatea score por tipo', () => {
    const none = {
      timeSeconds: null,
      repsAtTimeCap: null,
      rounds: null,
      extraReps: null,
      completed: null,
    };
    expect(formatScore('FOR_TIME', { ...none, timeSeconds: 822 })).toBe('13:42');
    expect(formatScore('FOR_TIME', { ...none, repsAtTimeCap: 142 })).toBe('Límite · 142 reps');
    expect(formatScore('AMRAP', { ...none, rounds: 8, extraReps: 7 })).toBe('8 rondas + 7 reps');
    expect(formatScore('EMOM', { ...none, completed: false })).toBe('No completado');
    expect(validateScore('FOR_TIME', none)).not.toEqual([]);
    expect(validateScore('FOR_TIME', { ...none, timeSeconds: 1, repsAtTimeCap: 2 })).not.toEqual(
      [],
    );
    expect(validateScore('AMRAP', none)).not.toEqual([]);
    expect(validateScore('STRENGTH', { ...none, rounds: 1 })).not.toEqual([]);
  });

  it('resume fuerza, cardio y ausencia de datos', () => {
    expect(
      summarizeSets('STRENGTH', [
        { reps: 5, loadKg: 100, distanceMeters: null, durationSeconds: null },
      ]),
    ).toBe('Volumen 500 kg');
    expect(
      summarizeSets('CARDIO', [
        { reps: null, loadKg: null, distanceMeters: 5000, durationSeconds: 1420 },
      ]),
    ).toBe('5 km · 23:40');
    expect(summarizeSets('CARDIO', [])).toBeNull();
  });
});

describe('marcas y ventanas', () => {
  it('deriva candidatos y conserva la primera serie empatada', () => {
    const results = [
      { ...empty, resultId: 'a', setNumber: 1, reps: 5, loadValue: 100, loadUnit: 'KILOGRAM' },
      { ...empty, resultId: 'b', setNumber: 2, reps: 5, loadValue: 100, loadUnit: 'KILOGRAM' },
    ] as const;
    const candidates = recordCandidates('STRENGTH', [
      { movementId: 'squat', recordTypes: ['WEIGHT'], results },
    ]);
    expect(candidates).toMatchObject([{ resultId: 'a', recordType: 'WEIGHT', repetitions: 5 }]);
    expect(recordCandidates('FOR_TIME', [])).toEqual([]);
    expect(
      recordCandidates('CARDIO', [
        {
          movementId: 'run',
          recordTypes: ['TIME', 'DISTANCE'],
          results: [
            {
              ...empty,
              resultId: 'r',
              setNumber: 1,
              distanceValue: 5,
              distanceUnit: 'KILOMETER',
              durationSeconds: 1500,
            },
          ],
        },
      ]).map((item) => item.recordType),
    ).toEqual(['TIME', 'DISTANCE']);
  });

  it('selecciona sólo mejoras estrictas y compara TIME por distancia', () => {
    const candidate = {
      resultId: 'x',
      movementId: 'run',
      recordType: 'TIME' as const,
      value: 1400,
      unit: 'SECOND' as const,
      normalizedValue: 1400,
      repetitions: null,
      distanceValue: 5,
      distanceUnit: 'KILOMETER' as const,
      distanceMeters: 5000,
    };
    expect(selectNewRecords([candidate], []).at(0)?.previousBest).toBeNull();
    expect(
      selectNewRecords(
        [candidate],
        [
          {
            movementId: 'run',
            entries: [
              {
                recordType: 'TIME',
                repetitions: null,
                distanceMeters: 5000,
                normalizedValue: 1500,
              },
            ],
          },
        ],
      ),
    ).toHaveLength(1);
    expect(
      selectNewRecords(
        [candidate],
        [
          {
            movementId: 'run',
            entries: [
              {
                recordType: 'TIME',
                repetitions: null,
                distanceMeters: 5000,
                normalizedValue: 1400,
              },
            ],
          },
        ],
      ),
    ).toHaveLength(0);
  });

  it('incluye límites de 7 y 30 días e ignora fechas inválidas', () => {
    const now = new Date('2026-07-31T12:00:00Z');
    expect(countInLastDays(['2026-07-25', '2026-07-01', 'bad'], 7, now)).toBe(1);
    expect(countInLastDays(['2026-07-02'], 30, now)).toBe(1);
    expect(countPerWeek(['2026-07-31', '2026-07-24'], 2, now)).toEqual([1, 1]);
  });
});
