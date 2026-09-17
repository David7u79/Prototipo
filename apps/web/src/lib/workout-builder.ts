import type { MovementSummary, WorkoutDetail } from '@garfit/types';
import type { WorkoutExerciseInput } from '@garfit/validation';

export type BuilderExercise = WorkoutExerciseInput & {
  name: string;
  recordTypes: MovementSummary['recordTypes'];
};

export function builderExercise(movement: MovementSummary): BuilderExercise {
  return {
    movementSlug: movement.slug,
    name: movement.name,
    recordTypes: movement.recordTypes,
    targetSets: 1,
    targetReps: 1,
    targetLoadValue: null,
    targetLoadUnit: null,
    targetDistanceValue: null,
    targetDistanceUnit: null,
    targetDurationSeconds: null,
    restSeconds: null,
    notes: null,
  };
}

export function mapWorkoutForBuilder(workout: WorkoutDetail): BuilderExercise[] {
  return workout.exercises.map((exercise) => ({
    movementSlug: exercise.movement.slug,
    name: exercise.movement.name,
    recordTypes: exercise.movement.recordTypes,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetLoadValue: exercise.targetLoadValue,
    targetLoadUnit: exercise.targetLoadUnit,
    targetDistanceValue: exercise.targetDistanceValue,
    targetDistanceUnit: exercise.targetDistanceUnit,
    targetDurationSeconds: exercise.targetDurationSeconds,
    restSeconds: exercise.restSeconds,
    notes: exercise.notes,
  }));
}
