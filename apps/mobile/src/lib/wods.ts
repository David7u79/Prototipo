import { formatDuration } from '@garfit/domain';
import type { WodExercise, WodSummary } from '@garfit/types';

export function wodPrescription(wod: WodSummary): string {
  if (wod.workoutType === 'AMRAP') return `AMRAP ${formatDuration(wod.durationSeconds ?? 0)}`;
  if (wod.workoutType === 'EMOM') return `EMOM ${formatDuration(wod.durationSeconds ?? 0)}`;
  if (wod.repScheme.length) return `${wod.repScheme.join('-')} · Por tiempo`;
  return wod.workoutType === 'FOR_TIME' ? 'Por tiempo' : wod.workoutType;
}

export function wodExerciseLabel(exercise: WodExercise): string {
  const details = [
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.loadValue && exercise.loadUnit
      ? formatLoad(exercise.loadValue, exercise.loadUnit)
      : null,
    exercise.distanceValue && exercise.distanceUnit
      ? formatDistance(exercise.distanceValue, exercise.distanceUnit)
      : null,
    exercise.durationSeconds ? formatDuration(exercise.durationSeconds) : null,
  ].filter(Boolean);
  return [exercise.movement.name, ...details].join(' · ');
}

function formatLoad(value: number, unit: 'KILOGRAM' | 'POUND'): string {
  return `${value} ${unit === 'KILOGRAM' ? 'kg' : 'lb'}`;
}

function formatDistance(value: number, unit: 'METER' | 'KILOMETER' | 'MILE'): string {
  return `${value} ${unit === 'METER' ? 'm' : unit === 'KILOMETER' ? 'km' : 'mi'}`;
}
