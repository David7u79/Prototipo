import { parseDuration, type WorkoutType } from '@garfit/domain';
import type { WorkoutResultsInput } from '@garfit/validation';

export function parseRepScheme(value: string): number[] | null {
  const values = value.split('-').map((part) => Number(part.trim()));
  return values.length > 0 && values.every((part) => Number.isInteger(part) && part > 0)
    ? values
    : null;
}

export function dateLabel(date: string, now = new Date()): string {
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  if (date === today) return 'Hoy';
  if (date === yesterday) return 'Ayer';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(
    new Date(date),
  );
}

export function resultsFromForm(formData: FormData): WorkoutResultsInput {
  const raw = String(formData.get('results') ?? '[]');
  const exercises = JSON.parse(raw) as WorkoutResultsInput['exercises'];
  const score = JSON.parse(String(formData.get('score') ?? 'null')) as WorkoutResultsInput['score'];
  return { exercises, score };
}

export function initialSets(exercise: {
  targetSets: number | null;
  targetReps: number | null;
  targetLoadValue: number | null;
  targetLoadUnit: 'KILOGRAM' | 'POUND' | null;
  targetDistanceValue: number | null;
  targetDistanceUnit: 'METER' | 'KILOMETER' | 'MILE' | null;
  targetDurationSeconds: number | null;
}) {
  return Array.from({ length: exercise.targetSets ?? 1 }, (_, index) => ({
    setNumber: index + 1,
    reps: exercise.targetReps,
    loadValue: exercise.targetLoadValue,
    loadUnit: exercise.targetLoadUnit,
    distanceValue: exercise.targetDistanceValue,
    distanceUnit: exercise.targetDistanceUnit,
    durationSeconds: exercise.targetDurationSeconds,
  }));
}

export function scoreFor(type: WorkoutType, formData: FormData) {
  const number = (name: string) => {
    const value = formData.get(name);
    return value === null || value === '' ? null : Number(value);
  };
  if (type === 'FOR_TIME') {
    return {
      timeSeconds: parseDuration(String(formData.get('time') ?? '')),
      repsAtTimeCap: number('reps'),
    };
  }
  if (type === 'AMRAP') return { rounds: number('rounds'), extraReps: number('extraReps') };
  if (type === 'EMOM') return { completed: formData.get('completed') === 'true' };
  return null;
}
