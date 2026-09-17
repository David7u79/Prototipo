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

/**
 * Comprueba la prescripción antes de enviarla: una carga o una distancia sin unidad es
 * ambigua y la API la rechaza, así que el formulario lo dice antes de intentar guardar.
 * Devuelve `null` cuando todo es coherente.
 */
export function prescriptionIssue(exercises: readonly BuilderExercise[]): string | null {
  for (const exercise of exercises) {
    if (exercise.targetLoadValue !== null && exercise.targetLoadUnit === null) {
      return `Elige la unidad de carga de ${exercise.name} (kg o lb).`;
    }
    if (exercise.targetLoadValue === null && exercise.targetLoadUnit !== null) {
      return `Indica la carga de ${exercise.name} o quita su unidad.`;
    }
    if (exercise.targetDistanceValue !== null && exercise.targetDistanceUnit === null) {
      return `Elige la unidad de distancia de ${exercise.name}.`;
    }
    if (exercise.targetDistanceValue === null && exercise.targetDistanceUnit !== null) {
      return `Indica la distancia de ${exercise.name} o quita su unidad.`;
    }
  }
  return null;
}
