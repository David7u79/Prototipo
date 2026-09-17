import { describe, expect, it } from 'vitest';
import type { WorkoutDetail } from '@garfit/types';
import {
  builderExercise,
  mapWorkoutForBuilder,
  prescriptionIssue,
  type BuilderExercise,
} from './workout-builder';

describe('builder de entrenamientos', () => {
  it('mapea un movimiento del catálogo a una prescripción editable', () => {
    const exercise = builderExercise({
      id: 'movement-id',
      slug: 'run',
      name: 'Run',
      category: 'CARDIO',
      equipment: 'BODY_WEIGHT',
      difficulty: null,
      primaryMuscles: [],
      secondaryMuscles: [],
      recordTypes: ['TIME'],
    });
    expect(exercise).toMatchObject({ movementSlug: 'run', targetSets: 1, targetReps: 1 });
    expect(exercise.recordTypes).toEqual(['TIME']);
  });

  it('precarga la prescripción de un borrador al editarlo', () => {
    const workout = {
      exercises: [
        {
          movement: { slug: 'run', name: 'Run', recordTypes: ['TIME'] },
          targetSets: 2,
          targetReps: 5,
          targetLoadValue: null,
          targetLoadUnit: null,
          targetDistanceValue: 5,
          targetDistanceUnit: 'KILOMETER',
          targetDurationSeconds: null,
          restSeconds: null,
          notes: 'Ritmo suave',
        },
      ],
    } as unknown as WorkoutDetail;
    expect(mapWorkoutForBuilder(workout)).toMatchObject([
      { movementSlug: 'run', targetSets: 2, targetDistanceValue: 5, notes: 'Ritmo suave' },
    ]);
  });
});

describe('prescriptionIssue', () => {
  const exercise = (overrides: Partial<BuilderExercise>): BuilderExercise => ({
    movementSlug: 'barbell-full-squat',
    name: 'Barbell full squat',
    recordTypes: ['WEIGHT'],
    targetSets: 1,
    targetReps: 5,
    targetLoadValue: null,
    targetLoadUnit: null,
    targetDistanceValue: null,
    targetDistanceUnit: null,
    targetDurationSeconds: null,
    restSeconds: null,
    notes: null,
    ...overrides,
  });

  it('acepta una prescripción sin carga ni distancia', () => {
    expect(prescriptionIssue([exercise({})])).toBeNull();
  });

  it('acepta carga y unidad coherentes', () => {
    expect(
      prescriptionIssue([exercise({ targetLoadValue: 100, targetLoadUnit: 'KILOGRAM' })]),
    ).toBeNull();
  });

  it('rechaza una carga sin unidad nombrando el movimiento', () => {
    expect(prescriptionIssue([exercise({ targetLoadValue: 100 })])).toBe(
      'Elige la unidad de carga de Barbell full squat (kg o lb).',
    );
  });

  it('rechaza una unidad de carga sin valor', () => {
    expect(prescriptionIssue([exercise({ targetLoadUnit: 'POUND' })])).toBe(
      'Indica la carga de Barbell full squat o quita su unidad.',
    );
  });

  it('rechaza una distancia sin unidad y una unidad sin distancia', () => {
    expect(prescriptionIssue([exercise({ targetDistanceValue: 400 })])).toBe(
      'Elige la unidad de distancia de Barbell full squat.',
    );
    expect(prescriptionIssue([exercise({ targetDistanceUnit: 'METER' })])).toBe(
      'Indica la distancia de Barbell full squat o quita su unidad.',
    );
  });

  it('señala el primer ejercicio incoherente de la lista', () => {
    const issue = prescriptionIssue([
      exercise({ targetLoadValue: 100, targetLoadUnit: 'KILOGRAM' }),
      exercise({ name: 'Run', movementSlug: 'run', targetDistanceValue: 5000 }),
    ]);
    expect(issue).toBe('Elige la unidad de distancia de Run.');
  });
});
