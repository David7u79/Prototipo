import type { Change } from './records.js';
import type { WorkoutType } from './rules.js';
import { roundTo, formatDuration } from './units.js';
import type { NormalizedSet, WorkoutScore } from './workouts.js';
import { countInLastDays, totalVolumeKg } from './workouts.js';

/**
 * Comparaciones deportivas deterministas: evolución en un mismo WOD y comparación entre
 * periodos. Todo se calcula aquí; la capa de IA sólo recibe los números ya hechos y los
 * interpreta (ADR 0009). Ninguna función de este módulo opina: describe diferencias.
 */

/** Por qué un tipo de entrenamiento no admite comparación numérica. */
export type ComparisonUnavailableReason =
  /** EMOM sólo registra si se completó: no hay magnitud que ordenar. */
  | 'SCORE_NO_COMPARABLE'
  /** AMRAP sin esquema de repeticiones conocido: las rondas no son convertibles a un total. */
  | 'ESQUEMA_DESCONOCIDO'
  /** CUSTOM y otros tipos sin resultado comparable definido. */
  | 'TIPO_NO_SOPORTADO';

/** Unidad del valor comparable de un WOD. */
export type ComparableUnit = 's' | 'reps' | 'kg';

/** Ejecución de un WOD con su resultado ya calculado. */
export interface WodAttemptInput {
  workoutId: string;
  performedOn: string;
  score: WorkoutScore;
  /** Series realizadas, para los tipos que se comparan por volumen. */
  sets: readonly NormalizedSet[];
}

export interface WodAttemptResult {
  workoutId: string;
  performedOn: string;
  /** Valor comparable en la unidad indicada por la comparación. */
  value: number;
  /** Representación original legible (`4:48`, `12 rondas + 3 reps`, `1425 kg`). */
  display: string;
}

export interface WodPerformanceComparison {
  workoutType: WorkoutType;
  /** `false` si el tipo no tiene un resultado comparable; entonces `history` va vacío. */
  comparisonAvailable: boolean;
  unavailableReason: ComparisonUnavailableReason | null;
  /** Unidad de `value`; `null` si no hay comparación. */
  unit: ComparableUnit | null;
  /** `true` en FOR_TIME: menos segundos es mejor. */
  lowerIsBetter: boolean;
  /** Ejecuciones completadas con resultado comparable. */
  attempts: number;
  best: WodAttemptResult | null;
  latest: WodAttemptResult | null;
  /** Penúltima ejecución; `null` con menos de dos. */
  previous: WodAttemptResult | null;
  /** Cambio de `previous` a `latest`; `null` con menos de dos ejecuciones. */
  change: Change | null;
  /** Ejecuciones comparables en orden cronológico. */
  history: WodAttemptResult[];
}

/** Repeticiones de una ronda del WOD, cuando su prescripción las fija (AMRAP). */
export interface WodRoundInfo {
  repsPerRound: number | null;
}

function comparableValue(
  workoutType: WorkoutType,
  attempt: WodAttemptInput,
  round: WodRoundInfo,
): WodAttemptResult | null {
  const base = { workoutId: attempt.workoutId, performedOn: attempt.performedOn };
  switch (workoutType) {
    case 'FOR_TIME': {
      // Una ejecución que agotó el tiempo límite no es comparable con una terminada.
      if (attempt.score.timeSeconds === null) return null;
      return {
        ...base,
        value: attempt.score.timeSeconds,
        display: formatDuration(attempt.score.timeSeconds),
      };
    }
    case 'AMRAP': {
      if (attempt.score.rounds === null || round.repsPerRound === null) return null;
      const extraReps = attempt.score.extraReps ?? 0;
      const total = attempt.score.rounds * round.repsPerRound + extraReps;
      return {
        ...base,
        value: total,
        display: extraReps
          ? `${attempt.score.rounds} rondas + ${extraReps} reps`
          : `${attempt.score.rounds} rondas`,
      };
    }
    case 'STRENGTH': {
      const volumeKg = totalVolumeKg(attempt.sets);
      if (volumeKg === 0) return null;
      return { ...base, value: volumeKg, display: `${volumeKg} kg` };
    }
    default:
      return null;
  }
}

function unavailable(
  workoutType: WorkoutType,
  round: WodRoundInfo,
): ComparisonUnavailableReason | null {
  if (workoutType === 'EMOM') return 'SCORE_NO_COMPARABLE';
  if (workoutType === 'AMRAP' && round.repsPerRound === null) return 'ESQUEMA_DESCONOCIDO';
  if (workoutType === 'FOR_TIME' || workoutType === 'AMRAP' || workoutType === 'STRENGTH') {
    return null;
  }
  return 'TIPO_NO_SOPORTADO';
}

const UNIT: Partial<Record<WorkoutType, ComparableUnit>> = {
  FOR_TIME: 's',
  AMRAP: 'reps',
  STRENGTH: 'kg',
};

function change(
  previous: WodAttemptResult,
  latest: WodAttemptResult,
  lowerIsBetter: boolean,
): Change {
  const absolute = roundTo(latest.value - previous.value, 3);
  return {
    absolute,
    percent: previous.value === 0 ? null : roundTo((absolute / previous.value) * 100, 2),
    improved: lowerIsBetter ? absolute < 0 : absolute > 0,
  };
}

/**
 * Compara ejecuciones del MISMO WOD (el llamador filtra por `wodId`; nunca por nombre).
 * Las ejecuciones sin resultado comparable se descartan y no cuentan como intento.
 */
export function compareWodPerformance(
  workoutType: WorkoutType,
  attempts: readonly WodAttemptInput[],
  round: WodRoundInfo = { repsPerRound: null },
): WodPerformanceComparison {
  const reason = unavailable(workoutType, round);
  const lowerIsBetter = workoutType === 'FOR_TIME';
  if (reason !== null) {
    return {
      workoutType,
      comparisonAvailable: false,
      unavailableReason: reason,
      unit: null,
      lowerIsBetter,
      attempts: 0,
      best: null,
      latest: null,
      previous: null,
      change: null,
      history: [],
    };
  }

  const history = [...attempts]
    .sort(
      (a, b) =>
        a.performedOn.localeCompare(b.performedOn) || a.workoutId.localeCompare(b.workoutId),
    )
    .flatMap((attempt) => {
      const result = comparableValue(workoutType, attempt, round);
      return result ? [result] : [];
    });

  const latest = history.at(-1) ?? null;
  const previous = history.length > 1 ? (history.at(-2) ?? null) : null;
  // Ante empate gana la primera ejecución que alcanzó el valor: la mejora hay que repetirla.
  const best = history.reduce<WodAttemptResult | null>((current, item) => {
    if (!current) return item;
    if (lowerIsBetter) return item.value < current.value ? item : current;
    return item.value > current.value ? item : current;
  }, null);

  return {
    workoutType,
    comparisonAvailable: true,
    unavailableReason: null,
    unit: UNIT[workoutType] ?? null,
    lowerIsBetter,
    attempts: history.length,
    best,
    latest,
    previous,
    change: previous && latest ? change(previous, latest, lowerIsBetter) : null,
    history,
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Comparación entre periodos                                                                  */
/* ------------------------------------------------------------------------------------------ */

export interface PeriodMetrics {
  workouts: number;
  /** Días distintos con al menos un entrenamiento completado. */
  trainingDays: number;
  volumeKg: number;
  personalRecords: number;
}

export interface PeriodMetricChange {
  absolute: number;
  /** Porcentaje respecto al periodo anterior; `null` si el anterior es 0. */
  percent: number | null;
}

/**
 * Diferencias descriptivas entre el periodo actual y el inmediatamente anterior de la misma
 * duración. No califica: no dice mejor ni peor, sólo cuánto cambió cada métrica.
 */
export interface PeriodComparison {
  days: number;
  current: PeriodMetrics;
  previous: PeriodMetrics;
  change: Record<keyof PeriodMetrics, PeriodMetricChange>;
}

/** Entrenamiento completado, con lo necesario para medir un periodo. */
export interface PeriodWorkoutInput {
  performedOn: string;
  sets: readonly NormalizedSet[];
}

function inWindow(date: string, days: number, offsetDays: number, now: Date): boolean {
  const withinOuter = countInLastDays([date], days + offsetDays, now) === 1;
  const withinInner = offsetDays === 0 ? false : countInLastDays([date], offsetDays, now) === 1;
  return withinOuter && !withinInner;
}

function metrics(
  workouts: readonly PeriodWorkoutInput[],
  recordDates: readonly string[],
  days: number,
  offsetDays: number,
  now: Date,
): PeriodMetrics {
  const selected = workouts.filter((workout) =>
    inWindow(workout.performedOn, days, offsetDays, now),
  );
  return {
    workouts: selected.length,
    trainingDays: new Set(selected.map((workout) => workout.performedOn)).size,
    volumeKg: roundTo(
      selected.reduce((total, workout) => total + totalVolumeKg(workout.sets), 0),
      3,
    ),
    personalRecords: recordDates.filter((date) => inWindow(date, days, offsetDays, now)).length,
  };
}

function metricChange(current: number, previous: number): PeriodMetricChange {
  const absolute = roundTo(current - previous, 3);
  return { absolute, percent: previous === 0 ? null : roundTo((absolute / previous) * 100, 2) };
}

/** Compara los últimos `days` días con los `days` días anteriores. */
export function comparePeriods(
  workouts: readonly PeriodWorkoutInput[],
  recordDates: readonly string[],
  days: number,
  now: Date = new Date(),
): PeriodComparison {
  const current = metrics(workouts, recordDates, days, 0, now);
  const previous = metrics(workouts, recordDates, days, days, now);
  return {
    days,
    current,
    previous,
    change: {
      workouts: metricChange(current.workouts, previous.workouts),
      trainingDays: metricChange(current.trainingDays, previous.trainingDays),
      volumeKg: metricChange(current.volumeKg, previous.volumeKg),
      personalRecords: metricChange(current.personalRecords, previous.personalRecords),
    },
  };
}
