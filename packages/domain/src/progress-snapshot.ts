import { comparePeriods, type PeriodComparison } from './comparisons.js';
import { ageInYears } from './dates.js';
import type { RecordEntry, RecordSeriesSummary } from './records.js';
import { lowerIsBetter, summarizeAll } from './records.js';
import type {
  ExperienceLevel,
  PrimaryGoal,
  RecordSource,
  RecordType,
  UnitSystem,
  WorkoutType,
} from './rules.js';
import { roundTo } from './units.js';
import type { NormalizedSet, WorkoutScore } from './workouts.js';
import { countInLastDays, countPerWeek, formatScore, totalVolumeKg } from './workouts.js';

/**
 * Contratos para describir el progreso de un atleta de forma estructurada. No dependen de
 * ningún proveedor de IA: una fase posterior los serializará como contexto para Gemini. Todos
 * los números ya vienen calculados de forma determinista; el modelo sólo los interpretará.
 */

/** Resumen de una serie de marcas de un movimiento, con valores en unidad canónica. */
export interface MovementRecordSummary {
  movementSlug: string;
  movementName: string;
  recordType: RecordType;
  /** Repeticiones de la serie de carga (1 = 1RM); `null` en otros tipos. */
  repetitions: number | null;
  /** Distancia que califica la serie de TIME, en metros; `null` en otros tipos. */
  distanceMeters: number | null;
  /** kg, repeticiones, metros o segundos según `recordType`. */
  canonicalUnit: 'KILOGRAM' | 'REPETITION' | 'METER' | 'SECOND';
  lowerIsBetter: boolean;
  entries: number;
  first: { value: number; performedAt: string };
  current: { value: number; performedAt: string };
  best: { value: number; performedAt: string };
  /** Cambio del primer registro al mejor; `null` con un solo registro. */
  absoluteProgress: number | null;
  percentProgress: number | null;
  /** Últimos registros de la serie en orden cronológico (como máximo `RECENT_HISTORY_LIMIT`). */
  recentHistory: { value: number; performedAt: string; isPersonalBest: boolean }[];
}

/** Entrenamiento completado, resumido. */
export interface WorkoutSummary {
  performedOn: string;
  workoutType: WorkoutType;
  name: string;
  /** Texto del score global (`formatScore`) o `null` si el tipo se mide por series. */
  score: string | null;
  /** Volumen total en kg (0 si no hubo carga). */
  volumeKg: number;
  exercises: number;
  /** Marcas personales que generó. */
  personalRecords: number;
}

export interface AthleteProgressSnapshot {
  generatedAt: string;
  athlete: {
    experienceLevel: ExperienceLevel | null;
    primaryGoal: PrimaryGoal | null;
    preferredUnits: UnitSystem;
    ageYears: number | null;
    trainingYears: number | null;
  };
  totals: {
    movementsWithRecords: number;
    records: number;
    completedWorkouts: number;
  };
  records: MovementRecordSummary[];
  /** Últimos entrenamientos completados, del más reciente al más antiguo. */
  recentWorkouts: WorkoutSummary[];
  /** Volumen en kg por movimiento en los últimos 30 días, de mayor a menor. */
  volumeByMovementLast30Days: { movementSlug: string; movementName: string; volumeKg: number }[];
  trends: {
    workoutsLast7Days: number;
    workoutsLast30Days: number;
    /** Entrenamientos por semana en las últimas 4 semanas (la última es la actual). */
    workoutsPerWeek: number[];
    /** Marcas registradas (manuales o derivadas) en los últimos 30 días. */
    personalRecordsLast30Days: number;
    personalRecordsFromWorkoutsLast30Days: number;
  };
  /** El periodo pedido frente al inmediatamente anterior de la misma duración. */
  periodComparison: PeriodComparison;
  /** Mismas métricas sobre el periodo pedido (30 días por defecto), usado por el análisis de IA. */
  period: {
    days: number;
    completedWorkouts: number;
    personalRecords: number;
    personalRecordsFromWorkouts: number;
    volumeByMovement: { movementSlug: string; movementName: string; volumeKg: number }[];
  };
}

export interface SnapshotProfileInput {
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  preferredUnits: UnitSystem;
  birthDate: string | null;
  trainingSince: string | null;
}

export interface SnapshotMovementRecords {
  movementSlug: string;
  movementName: string;
  entries: (RecordEntry & { source?: RecordSource })[];
}

/** Entrenamiento completado con lo necesario para resumirlo. */
export interface SnapshotWorkoutInput {
  performedOn: string;
  workoutType: WorkoutType;
  name: string;
  score: WorkoutScore;
  personalRecords: number;
  exercises: { movementSlug: string; movementName: string; sets: NormalizedSet[] }[];
}

const RECENT_WORKOUTS_LIMIT = 10;
const RECENT_HISTORY_LIMIT = 5;

const CANONICAL: Record<RecordType, MovementRecordSummary['canonicalUnit']> = {
  WEIGHT: 'KILOGRAM',
  REPS: 'REPETITION',
  DISTANCE: 'METER',
  DURATION: 'SECOND',
  TIME: 'SECOND',
};

const point = (entry: RecordEntry) => ({
  value: entry.normalizedValue,
  performedAt: entry.performedAt,
});

function toSummary(
  movement: SnapshotMovementRecords,
  series: RecordSeriesSummary,
): MovementRecordSummary {
  return {
    movementSlug: movement.movementSlug,
    movementName: movement.movementName,
    recordType: series.recordType,
    repetitions: series.repetitions,
    distanceMeters: series.distanceMeters,
    canonicalUnit: CANONICAL[series.recordType],
    lowerIsBetter: lowerIsBetter(series.recordType),
    entries: series.count,
    first: point(series.first),
    current: point(series.current),
    best: point(series.best),
    absoluteProgress: series.totalProgress?.absolute ?? null,
    percentProgress: series.totalProgress?.percent ?? null,
    recentHistory: series.history.slice(-RECENT_HISTORY_LIMIT).map((entry) => ({
      ...point(entry),
      isPersonalBest: entry.isPersonalBest,
    })),
  };
}

function summarizeWorkout(workout: SnapshotWorkoutInput): WorkoutSummary {
  return {
    performedOn: workout.performedOn,
    workoutType: workout.workoutType,
    name: workout.name,
    score: formatScore(workout.workoutType, workout.score),
    volumeKg: totalVolumeKg(workout.exercises.flatMap((exercise) => exercise.sets)),
    exercises: workout.exercises.length,
    personalRecords: workout.personalRecords,
  };
}

function volumeByMovement(
  workouts: readonly SnapshotWorkoutInput[],
  now: Date,
  days: number,
): AthleteProgressSnapshot['volumeByMovementLast30Days'] {
  const recent = workouts.filter(
    (workout) => countInLastDays([workout.performedOn], days, now) === 1,
  );
  const totals = new Map<
    string,
    { movementSlug: string; movementName: string; volumeKg: number }
  >();
  for (const exercise of recent.flatMap((workout) => workout.exercises)) {
    const volume = totalVolumeKg(exercise.sets);
    if (volume === 0) continue;
    const current = totals.get(exercise.movementSlug) ?? {
      movementSlug: exercise.movementSlug,
      movementName: exercise.movementName,
      volumeKg: 0,
    };
    current.volumeKg = roundTo(current.volumeKg + volume, 3);
    totals.set(exercise.movementSlug, current);
  }
  return [...totals.values()].sort((a, b) => b.volumeKg - a.volumeKg);
}

/**
 * Construye la instantánea de progreso a partir de datos ya leídos de la base. `periodDays`
 * sólo afecta al bloque `period`; los campos `...Last30Days` conservan su ventana fija.
 */
export function buildProgressSnapshot(
  profile: SnapshotProfileInput | null,
  movements: readonly SnapshotMovementRecords[],
  now: Date = new Date(),
  workouts: readonly SnapshotWorkoutInput[] = [],
  periodDays = 30,
): AthleteProgressSnapshot {
  const withEntries = movements.filter((movement) => movement.entries.length > 0);
  const records = withEntries.flatMap((movement) =>
    summarizeAll(movement.entries).map((series) => toSummary(movement, series)),
  );
  const allEntries = withEntries.flatMap((movement) => movement.entries);
  const recordDates = allEntries.map((entry) => entry.performedAt);
  const workoutRecordDates = allEntries
    .filter((entry) => entry.source === 'WORKOUT')
    .map((entry) => entry.performedAt);
  const workoutDates = workouts.map((workout) => workout.performedOn);
  const byRecency = [...workouts].sort((a, b) => b.performedOn.localeCompare(a.performedOn));

  return {
    generatedAt: now.toISOString(),
    athlete: {
      experienceLevel: profile?.experienceLevel ?? null,
      primaryGoal: profile?.primaryGoal ?? null,
      preferredUnits: profile?.preferredUnits ?? 'METRIC',
      ageYears: profile?.birthDate ? ageInYears(profile.birthDate, now) : null,
      trainingYears: profile?.trainingSince ? ageInYears(profile.trainingSince, now) : null,
    },
    totals: {
      movementsWithRecords: withEntries.length,
      records: allEntries.length,
      completedWorkouts: workouts.length,
    },
    records,
    recentWorkouts: byRecency.slice(0, RECENT_WORKOUTS_LIMIT).map(summarizeWorkout),
    volumeByMovementLast30Days: volumeByMovement(workouts, now, 30),
    trends: {
      workoutsLast7Days: countInLastDays(workoutDates, 7, now),
      workoutsLast30Days: countInLastDays(workoutDates, 30, now),
      workoutsPerWeek: countPerWeek(workoutDates, 4, now),
      personalRecordsLast30Days: countInLastDays(recordDates, 30, now),
      personalRecordsFromWorkoutsLast30Days: countInLastDays(workoutRecordDates, 30, now),
    },
    periodComparison: comparePeriods(
      workouts.map((workout) => ({
        performedOn: workout.performedOn,
        sets: workout.exercises.flatMap((exercise) => exercise.sets),
      })),
      recordDates,
      periodDays,
      now,
    ),
    period: {
      days: periodDays,
      completedWorkouts: countInLastDays(workoutDates, periodDays, now),
      personalRecords: countInLastDays(recordDates, periodDays, now),
      personalRecordsFromWorkouts: countInLastDays(workoutRecordDates, periodDays, now),
      volumeByMovement: volumeByMovement(workouts, now, periodDays),
    },
  };
}
