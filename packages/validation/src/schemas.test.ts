import { describe, expect, it } from 'vitest';
import {
  athleteProfileSchema,
  completeWorkoutSchema,
  createRecordSchema,
  createWorkoutSchema,
  movementFiltersSchema,
  updateRecordSchema,
  updateRecordSchemaFor,
  updateWorkoutSchema,
  wodFiltersSchema,
  workoutResultsSchema,
  workoutScoreInputSchema,
  AI_OUTPUT_LIMITS,
  aiModelOutputJsonSchema,
  aiModelOutputSchema,
  aiProgressRequestSchema,
} from './index.js';

const profile = { displayName: 'Ana', experienceLevel: 'BEGINNER', primaryGoal: 'STRENGTH' };
const freeWorkout = {
  name: 'Fuerza',
  workoutType: 'STRENGTH',
  exercises: [{ movementSlug: 'squat' }],
};
const record = {
  movementSlug: 'squat',
  recordType: 'WEIGHT',
  value: 100,
  unit: 'KILOGRAM',
  repetitions: 1,
  performedAt: '2026-01-01',
};
const paths = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('athleteProfileSchema', () => {
  it('aplica null y METRIC a los campos opcionales', () => {
    expect(athleteProfileSchema.parse(profile)).toMatchObject({
      preferredUnits: 'METRIC',
      birthDate: null,
      heightCm: null,
      weightKg: null,
      trainingSince: null,
    });
  });

  it('informa el campo de fechas, edad y medidas inválidas', () => {
    for (const [input, path] of [
      [{ ...profile, birthDate: '2026-02-30' }, 'birthDate'],
      [{ ...profile, birthDate: '2100-01-01' }, 'birthDate'],
      [{ ...profile, birthDate: '1800-01-01' }, 'birthDate'],
      [{ ...profile, birthDate: '2000-01-01', trainingSince: '1999-01-01' }, 'trainingSince'],
      [{ ...profile, heightCm: 20 }, 'heightCm'],
      [{ ...profile, weightKg: 1.234 }, 'weightKg'],
    ] as const)
      expect(paths(athleteProfileSchema.safeParse(input))).toContain(path);
  });
});

describe('createRecordSchema', () => {
  it('exige combinaciones y límites canónicos correctos', () => {
    const cases = [
      [{ ...record, repetitions: null }, 'repetitions'],
      [{ ...record, recordType: 'REPS', unit: 'REPETITION', repetitions: 2 }, 'repetitions'],
      [{ ...record, unit: 'SECOND' }, 'unit'],
      [{ ...record, value: 0 }, 'value'],
      [{ ...record, value: 1.2345 }, 'value'],
      [{ ...record, value: 1001 }, 'value'],
      [{ ...record, unit: 'POUND', value: 2300 }, 'value'],
      [{ ...record, recordType: 'TIME', unit: 'SECOND', repetitions: null }, 'distanceValue'],
      [{ ...record, distanceValue: 5, distanceUnit: 'KILOMETER' }, 'distanceValue'],
      [{ ...record, performedAt: '1899-12-31' }, 'performedAt'],
    ] as const;
    for (const [input, path] of cases)
      expect(paths(createRecordSchema.safeParse(input))).toContain(path);
    expect(
      createRecordSchema.safeParse({
        ...record,
        recordType: 'TIME',
        unit: 'SECOND',
        repetitions: null,
        distanceValue: 5,
        distanceUnit: 'KILOMETER',
      }).success,
    ).toBe(true);
  });
});

describe('PATCH y filtros', () => {
  it('valida pares, vacío y el tipo existente sin impedir notas', () => {
    expect(updateRecordSchema.safeParse({}).success).toBe(false);
    expect(updateRecordSchema.safeParse({ value: 1 }).success).toBe(false);
    expect(updateRecordSchema.safeParse({ distanceValue: 1 }).success).toBe(false);
    expect(
      updateRecordSchemaFor({
        recordType: 'TIME',
        distanceValue: 5000,
        distanceUnit: 'METER',
      }).safeParse({ notes: 'ok' }).success,
    ).toBe(true);
    expect(
      updateRecordSchemaFor({
        recordType: 'WEIGHT',
        distanceValue: null,
        distanceUnit: null,
      }).safeParse({ value: 10, unit: 'SECOND' }).success,
    ).toBe(false);
  });

  it('coacciona paginación y benchmark y rechaza límites inválidos', () => {
    expect(movementFiltersSchema.parse({ page: '2', limit: '50' })).toMatchObject({
      page: 2,
      limit: 50,
    });
    expect(movementFiltersSchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(wodFiltersSchema.parse({ benchmark: 'true' }).benchmark).toBe(true);
    expect(wodFiltersSchema.parse({ benchmark: 'false' }).benchmark).toBe(false);
    expect(wodFiltersSchema.safeParse({ workoutType: 'NOPE' }).success).toBe(false);
  });
});

describe('esquemas de entrenamiento', () => {
  it('separa WOD estricto y entrenamiento libre con prescripción válida', () => {
    expect(createWorkoutSchema.safeParse({ wodSlug: 'fran' }).success).toBe(true);
    expect(createWorkoutSchema.safeParse({ wodSlug: 'fran', workoutType: 'AMRAP' }).success).toBe(
      false,
    );
    expect(createWorkoutSchema.safeParse(freeWorkout).success).toBe(true);
    expect(createWorkoutSchema.safeParse({ ...freeWorkout, exercises: [] }).success).toBe(false);
    expect(createWorkoutSchema.safeParse({ ...freeWorkout, workoutType: 'AMRAP' }).success).toBe(
      false,
    );
    expect(
      createWorkoutSchema.safeParse({
        ...freeWorkout,
        workoutType: 'EMOM',
        durationSeconds: 61,
        intervalSeconds: 60,
      }).success,
    ).toBe(false);
    expect(createWorkoutSchema.safeParse({ ...freeWorkout, repScheme: [1] }).success).toBe(false);
    expect(updateWorkoutSchema.safeParse({}).success).toBe(false);
    expect(updateWorkoutSchema.safeParse({ unknown: true }).success).toBe(false);
  });

  it('rechaza resultados repetidos, inválidos y scores con extras', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const set = { setNumber: 1, reps: 1, loadValue: 10, loadUnit: 'KILOGRAM' };
    expect(
      workoutResultsSchema.safeParse({ exercises: [{ exerciseId: id, sets: [set, set] }] }).success,
    ).toBe(false);
    expect(
      workoutResultsSchema.safeParse({ exercises: [{ exerciseId: 'bad', sets: [set] }] }).success,
    ).toBe(false);
    expect(
      workoutResultsSchema.safeParse({ exercises: [{ exerciseId: id, sets: [{ setNumber: 1 }] }] })
        .success,
    ).toBe(false);
    expect(workoutScoreInputSchema.parse({})).toEqual({
      timeSeconds: null,
      repsAtTimeCap: null,
      rounds: null,
      extraReps: null,
      completed: null,
    });
    expect(workoutScoreInputSchema.safeParse({ extra: true }).success).toBe(false);
    expect(completeWorkoutSchema.safeParse({ performedOn: '2100-01-01' }).success).toBe(false);
  });
});

describe('esquemas de IA', () => {
  const output = {
    status: 'COMPLETED',
    summary: 'Resumen útil',
    observations: [
      {
        title: 'Progreso',
        description: 'La sentadilla mejoró.',
        evidenceIds: ['pr:squat:weight-1rm:best'],
      },
    ],
    suggestions: [
      { title: 'Siguiente paso', description: 'Mantén la progresión.', evidenceIds: [] },
    ],
    limitations: ['Pocos entrenamientos'],
    missingData: ['RPE'],
  };

  it('acepta una salida válida y rechaza estructura, estado, evidencia y textos inválidos', () => {
    expect(aiModelOutputSchema.safeParse(output).success).toBe(true);
    expect(aiModelOutputSchema.safeParse({ ...output, extra: true }).success).toBe(false);
    expect(aiModelOutputSchema.safeParse({ ...output, status: 'PENDING' }).success).toBe(false);
    expect(
      aiModelOutputSchema.safeParse({
        ...output,
        observations: [{ ...output.observations[0], evidenceIds: [] }],
      }).success,
    ).toBe(false);
    expect(
      aiModelOutputSchema.safeParse({
        ...output,
        observations: Array.from(
          { length: AI_OUTPUT_LIMITS.observations + 1 },
          () => output.observations[0],
        ),
      }).success,
    ).toBe(false);
    expect(aiModelOutputSchema.safeParse({ ...output, summary: ' ' }).success).toBe(false);
    expect(
      aiModelOutputSchema.safeParse({
        ...output,
        summary: 'x'.repeat(AI_OUTPUT_LIMITS.summary + 1),
      }).success,
    ).toBe(false);
  });

  it('expone un JSON Schema estricto con las propiedades de salida esperadas', () => {
    expect(aiModelOutputJsonSchema).toMatchObject({ type: 'object', additionalProperties: false });
    expect(Object.keys(aiModelOutputJsonSchema.properties ?? {}).sort()).toEqual([
      'limitations',
      'missingData',
      'observations',
      'status',
      'suggestions',
      'summary',
    ]);
  });

  it('aplica 30 días por defecto y sólo admite los periodos de IA configurados', () => {
    expect(aiProgressRequestSchema.parse({}).periodDays).toBe(30);
    expect(aiProgressRequestSchema.parse({ periodDays: 60 }).periodDays).toBe(60);
    expect(aiProgressRequestSchema.parse({ periodDays: 90 }).periodDays).toBe(90);
    expect(aiProgressRequestSchema.safeParse({ periodDays: 45 }).success).toBe(false);
    expect(aiProgressRequestSchema.safeParse({ periodDays: '30' }).success).toBe(false);
  });
});
