import { describe, expect, it } from 'vitest';
import type { WorkoutDetail } from '@garfit/types';
import { builderExercise, mapWorkoutForBuilder } from './workout-builder';

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
