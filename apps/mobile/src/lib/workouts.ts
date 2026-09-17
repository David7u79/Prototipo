import { EMPTY_SCORE, formatDuration, parseDuration, type WorkoutScore } from '@garfit/domain';
import type { WorkoutDetail, WorkoutListItem, WorkoutType } from '@garfit/types';
import type { CreateWorkoutInput, WorkoutResultsInput } from '@garfit/validation';

export type EditableSet = {
  reps: string;
  loadValue: string;
  loadUnit: 'KILOGRAM' | 'POUND';
  distanceValue: string;
  distanceUnit: 'METER' | 'KILOMETER' | 'MILE';
  duration: string;
};

const numberOrNull = (text: string, integer = false) => {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && (!integer || Number.isInteger(value)) ? value : null;
};

export function parseRepScheme(text: string): number[] | null {
  if (!text.trim()) return [];
  const values = text.split('-').map((value) => Number(value.trim()));
  return values.length && values.every((value) => Number.isInteger(value) && value > 0)
    ? values
    : null;
}

export function formatRepScheme(values: readonly number[]): string {
  return values.join('-');
}

export function prefillSets(workout: WorkoutDetail): Record<string, EditableSet[]> {
  return Object.fromEntries(
    workout.exercises.map((exercise) => {
      const source = exercise.results;
      return [
        exercise.id,
        (source.length ? source : Array.from({ length: exercise.targetSets ?? 1 }, () => null)).map(
          (set): EditableSet => ({
            reps:
              set?.reps !== null && set?.reps !== undefined
                ? String(set.reps)
                : String(exercise.targetReps ?? ''),
            loadValue:
              set?.loadValue !== null && set?.loadValue !== undefined
                ? String(set.loadValue)
                : String(exercise.targetLoadValue ?? ''),
            loadUnit: set?.loadUnit ?? exercise.targetLoadUnit ?? 'KILOGRAM',
            distanceValue:
              set?.distanceValue !== null && set?.distanceValue !== undefined
                ? String(set.distanceValue)
                : String(exercise.targetDistanceValue ?? ''),
            distanceUnit: set?.distanceUnit ?? exercise.targetDistanceUnit ?? 'METER',
            duration:
              set?.durationSeconds !== null && set?.durationSeconds !== undefined
                ? formatDuration(set.durationSeconds)
                : exercise.targetDurationSeconds
                  ? formatDuration(exercise.targetDurationSeconds)
                  : '',
          }),
        ),
      ];
    }),
  );
}

export function resultsPayload(
  sets: Record<string, EditableSet[]>,
  score: WorkoutScore,
): WorkoutResultsInput {
  return {
    exercises: Object.entries(sets).map(([exerciseId, values]) => ({
      exerciseId,
      sets: values.map((set, index) => ({
        setNumber: index + 1,
        reps: numberOrNull(set.reps, true),
        loadValue: numberOrNull(set.loadValue),
        loadUnit: set.loadValue.trim() ? set.loadUnit : null,
        distanceValue: numberOrNull(set.distanceValue),
        distanceUnit: set.distanceValue.trim() ? set.distanceUnit : null,
        durationSeconds: parseDuration(set.duration),
      })),
    })),
    score,
  };
}

export function emptyScore(): WorkoutScore {
  return { ...EMPTY_SCORE };
}

export type EditableExercise = {
  movementSlug: string;
  name: string;
  recordTypes: readonly string[];
  sets: string;
  reps: string;
  loadValue: string;
  loadUnit: 'KILOGRAM' | 'POUND';
  distanceValue: string;
  distanceUnit: 'METER' | 'KILOMETER' | 'MILE';
  duration: string;
};

export function createWorkoutPayload(input: {
  name: string;
  workoutType: WorkoutType;
  duration: string;
  rounds: string;
  interval: string;
  repScheme: string;
  exercises: EditableExercise[];
}): CreateWorkoutInput {
  const optional = (value: string, integer = false) =>
    value.trim() ? numberOrNull(value, integer) : null;
  return {
    name: input.name,
    workoutType: input.workoutType,
    description: null,
    notes: null,
    durationSeconds: parseDuration(input.duration),
    rounds: optional(input.rounds, true),
    intervalSeconds: parseDuration(input.interval),
    repScheme: parseRepScheme(input.repScheme) ?? [],
    exercises: input.exercises.map((exercise) => ({
      movementSlug: exercise.movementSlug,
      targetSets: optional(exercise.sets, true),
      targetReps: optional(exercise.reps, true),
      targetLoadValue: optional(exercise.loadValue),
      targetLoadUnit: exercise.loadValue.trim() ? exercise.loadUnit : null,
      targetDistanceValue: optional(exercise.distanceValue),
      targetDistanceUnit: exercise.distanceValue.trim() ? exercise.distanceUnit : null,
      targetDurationSeconds: parseDuration(exercise.duration),
      restSeconds: null,
      notes: null,
    })),
  };
}

export function relativeDate(date: string | null): string {
  if (!date) return 'Sin fecha';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date === today.toISOString().slice(0, 10)) return 'Hoy';
  if (date === yesterday.toISOString().slice(0, 10)) return 'Ayer';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function groupWorkouts(
  items: WorkoutListItem[],
): { date: string; items: WorkoutListItem[] }[] {
  return items.reduce<{ date: string; items: WorkoutListItem[] }[]>((groups, item) => {
    const date = relativeDate(item.performedOn);
    const group = groups.at(-1);
    if (group?.date === date) group.items.push(item);
    else groups.push({ date, items: [item] });
    return groups;
  }, []);
}
