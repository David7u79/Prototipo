import { isValidIsoDate } from './dates.js';
import type { RecordEntry } from './records.js';
import { isBetter, seriesKey } from './records.js';
import type { DistanceUnit, LoadUnit, RecordType, WorkoutType } from './rules.js';
import { WORKOUT_LIMITS } from './rules.js';
import { formatDuration, formatRecordValue, roundTo, toCanonical } from './units.js';

/**
 * Lógica determinista de entrenamientos: volumen, validación y formato del score global,
 * detección de marcas personales derivadas y estadísticas básicas. Nada aquí usa IA.
 */

// --- Prescripción ------------------------------------------------------------------------

/** Parámetros globales de un entrenamiento o WOD. */
export interface WorkoutPrescription {
  durationSeconds: number | null;
  rounds: number | null;
  intervalSeconds: number | null;
  repScheme: readonly number[];
}

/**
 * Valida qué parámetros globales exige o admite cada tipo:
 * - AMRAP: duración obligatoria.
 * - EMOM: duración e intervalo obligatorios; la duración es múltiplo del intervalo.
 * - FOR_TIME: tiempo límite, rondas o esquema de repeticiones opcionales.
 * - STRENGTH y CARDIO: sin rondas, intervalo ni esquema (la prescripción va por ejercicio).
 * - CUSTOM: cualquier combinación válida salvo intervalo.
 */
export function validatePrescription(
  workoutType: WorkoutType,
  prescription: WorkoutPrescription,
): string[] {
  const errors: string[] = [];
  const { durationSeconds, rounds, intervalSeconds, repsPerSet, repSchemeMaxLength } =
    WORKOUT_LIMITS;
  const outOfRange = (value: number | null, min: number, max: number) =>
    value !== null && (!Number.isInteger(value) || value < min || value > max);

  if (outOfRange(prescription.durationSeconds, durationSeconds.min, durationSeconds.max)) {
    errors.push('La duración está fuera del rango permitido');
  }
  if (outOfRange(prescription.rounds, 1, rounds.max)) errors.push('Rondas fuera de rango');
  if (outOfRange(prescription.intervalSeconds, intervalSeconds.min, intervalSeconds.max)) {
    errors.push('El intervalo está fuera del rango permitido');
  }
  if (prescription.repScheme.length > repSchemeMaxLength) {
    errors.push(`El esquema admite como máximo ${repSchemeMaxLength} rondas`);
  }
  if (prescription.repScheme.some((reps) => outOfRange(reps, 1, repsPerSet.max))) {
    errors.push('El esquema de repeticiones tiene valores inválidos');
  }

  const has = {
    duration: prescription.durationSeconds !== null,
    rounds: prescription.rounds !== null,
    interval: prescription.intervalSeconds !== null,
    repScheme: prescription.repScheme.length > 0,
  };
  const forbid = (keys: (keyof typeof has)[]) => {
    for (const key of keys) if (has[key]) errors.push(`${key} no aplica a ${workoutType}`);
  };

  switch (workoutType) {
    case 'AMRAP':
      if (!has.duration) errors.push('Un AMRAP necesita duración');
      forbid(['interval']);
      break;
    case 'EMOM':
      if (!has.duration || !has.interval) errors.push('Un EMOM necesita duración e intervalo');
      if (
        has.duration &&
        has.interval &&
        (prescription.durationSeconds as number) % (prescription.intervalSeconds as number) !== 0
      ) {
        errors.push('La duración de un EMOM debe ser múltiplo del intervalo');
      }
      forbid(['rounds', 'repScheme']);
      break;
    case 'FOR_TIME':
      forbid(['interval']);
      if (has.rounds && has.repScheme)
        errors.push('Usa rondas o esquema de repeticiones, no ambos');
      break;
    case 'CUSTOM':
      forbid(['interval']);
      break;
    default:
      forbid(['rounds', 'interval', 'repScheme']);
  }
  return errors;
}

// --- Series ejecutadas -------------------------------------------------------------------

/** Una serie realizada, con los valores tal como se introdujeron. Todos los campos opcionales. */
export interface SetPerformance {
  reps: number | null;
  loadValue: number | null;
  loadUnit: LoadUnit | null;
  distanceValue: number | null;
  distanceUnit: DistanceUnit | null;
  durationSeconds: number | null;
}

/** Valores canónicos de una serie (kg, metros). */
export interface NormalizedSet {
  reps: number | null;
  loadKg: number | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
}

/**
 * Normaliza una serie y valida sus combinaciones. Devuelve la lista de problemas (vacía si es
 * válida) para que API y clientes muestren el mismo motivo.
 */
export function normalizeSet(set: SetPerformance): { value: NormalizedSet; errors: string[] } {
  const errors: string[] = [];
  const { repsPerSet, loadKg, distanceMeters, durationSeconds } = WORKOUT_LIMITS;

  if ((set.loadValue === null) !== (set.loadUnit === null)) {
    errors.push('La carga necesita valor y unidad');
  }
  if ((set.distanceValue === null) !== (set.distanceUnit === null)) {
    errors.push('La distancia necesita valor y unidad');
  }
  if (
    set.reps !== null &&
    (!Number.isInteger(set.reps) || set.reps < repsPerSet.min || set.reps > repsPerSet.max)
  ) {
    errors.push(`Las repeticiones deben ser un entero entre ${repsPerSet.min} y ${repsPerSet.max}`);
  }
  if (
    set.durationSeconds !== null &&
    (!Number.isInteger(set.durationSeconds) ||
      set.durationSeconds < durationSeconds.min ||
      set.durationSeconds > durationSeconds.max)
  ) {
    errors.push('La duración está fuera del rango permitido');
  }

  const load =
    set.loadValue !== null && set.loadUnit ? toCanonical(set.loadValue, set.loadUnit) : null;
  if (load !== null && (load < loadKg.min || load > loadKg.max)) {
    errors.push('La carga está fuera del rango permitido');
  }
  if (load !== null && set.reps === null) {
    errors.push('Una carga necesita repeticiones');
  }
  const distance =
    set.distanceValue !== null && set.distanceUnit
      ? toCanonical(set.distanceValue, set.distanceUnit)
      : null;
  if (distance !== null && (distance < distanceMeters.min || distance > distanceMeters.max)) {
    errors.push('La distancia está fuera del rango permitido');
  }
  if (set.reps === null && load === null && distance === null && set.durationSeconds === null) {
    errors.push('La serie no tiene ningún dato');
  }

  return {
    value: {
      reps: set.reps,
      loadKg: load,
      distanceMeters: distance,
      durationSeconds: set.durationSeconds,
    },
    errors,
  };
}

// --- Volumen -----------------------------------------------------------------------------

/** Volumen de una serie en kg: repeticiones × carga. 0 si falta alguno. Lanza con negativos. */
export function setVolumeKg(set: Pick<NormalizedSet, 'reps' | 'loadKg'>): number {
  const { reps, loadKg } = set;
  for (const value of [reps, loadKg]) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      throw new RangeError('El volumen necesita repeticiones y carga no negativas');
    }
  }
  if (reps === null || loadKg === null) return 0;
  return roundTo(reps * loadKg, 3);
}

/** Volumen total de un conjunto de series (suma real serie a serie, no sets × reps × carga). */
export function totalVolumeKg(sets: readonly Pick<NormalizedSet, 'reps' | 'loadKg'>[]): number {
  return roundTo(
    sets.reduce((total, set) => total + setVolumeKg(set), 0),
    3,
  );
}

// --- Score global ------------------------------------------------------------------------

/** Resultado global de un entrenamiento. Qué campos aplican depende del tipo. */
export interface WorkoutScore {
  /** FOR_TIME: tiempo total en segundos (null si se alcanzó el límite). */
  timeSeconds: number | null;
  /** FOR_TIME con límite alcanzado: repeticiones completadas al terminar el tiempo. */
  repsAtTimeCap: number | null;
  /** AMRAP: rondas completas. */
  rounds: number | null;
  /** AMRAP: repeticiones de la ronda incompleta. */
  extraReps: number | null;
  /** EMOM: si se completó el trabajo de todos los intervalos. */
  completed: boolean | null;
}

export const EMPTY_SCORE: WorkoutScore = {
  timeSeconds: null,
  repsAtTimeCap: null,
  rounds: null,
  extraReps: null,
  completed: null,
};

/** Tipos cuyo resultado principal vive en las series, no en un score global. */
export const SET_BASED_WORKOUT_TYPES: readonly WorkoutType[] = ['STRENGTH', 'CARDIO', 'CUSTOM'];

/**
 * Comprueba que el score tenga lo que su tipo exige y nada que no le corresponda.
 * Devuelve la lista de problemas (vacía si es válido).
 */
export function validateScore(workoutType: WorkoutType, score: WorkoutScore): string[] {
  const errors: string[] = [];
  const present = (key: keyof WorkoutScore) => score[key] !== null;
  const forbid = (...keys: (keyof WorkoutScore)[]) => {
    for (const key of keys) if (present(key)) errors.push(`${key} no aplica a ${workoutType}`);
  };
  const intIn = (value: number | null, min: number, max: number) =>
    value === null || (Number.isInteger(value) && value >= min && value <= max);

  const { durationSeconds, rounds, repsPerSet } = WORKOUT_LIMITS;
  if (!intIn(score.timeSeconds, durationSeconds.min, durationSeconds.max))
    errors.push('Tiempo fuera de rango');
  if (!intIn(score.repsAtTimeCap, 0, 100_000)) errors.push('Repeticiones al límite fuera de rango');
  if (!intIn(score.rounds, rounds.min, rounds.max)) errors.push('Rondas fuera de rango');
  if (!intIn(score.extraReps, repsPerSet.min, repsPerSet.max))
    errors.push('Repeticiones extra fuera de rango');

  switch (workoutType) {
    case 'FOR_TIME':
      forbid('rounds', 'extraReps', 'completed');
      if (present('timeSeconds') === present('repsAtTimeCap')) {
        errors.push('Indica el tiempo, o las repeticiones si se alcanzó el tiempo límite');
      }
      break;
    case 'AMRAP':
      forbid('timeSeconds', 'repsAtTimeCap', 'completed');
      if (!present('rounds')) errors.push('Indica las rondas completadas');
      break;
    case 'EMOM':
      forbid('timeSeconds', 'repsAtTimeCap', 'rounds', 'extraReps');
      if (!present('completed')) errors.push('Indica si completaste todos los intervalos');
      break;
    default:
      forbid('timeSeconds', 'repsAtTimeCap', 'rounds', 'extraReps', 'completed');
  }
  return errors;
}

/**
 * Texto del score: "13:42", "Límite · 142 reps", "8 rondas + 7 reps", "Completado".
 * `null` si el tipo no tiene score global o aún no se registró.
 */
export function formatScore(workoutType: WorkoutType, score: WorkoutScore): string | null {
  switch (workoutType) {
    case 'FOR_TIME':
      if (score.timeSeconds !== null) return formatDuration(score.timeSeconds);
      return score.repsAtTimeCap !== null ? `Límite · ${score.repsAtTimeCap} reps` : null;
    case 'AMRAP':
      if (score.rounds === null) return null;
      return score.extraReps
        ? `${score.rounds} rondas + ${score.extraReps} reps`
        : `${score.rounds} rondas`;
    case 'EMOM':
      return score.completed === null ? null : score.completed ? 'Completado' : 'No completado';
    default:
      return null;
  }
}

/**
 * Resumen principal de un entrenamiento basado en series: volumen en fuerza, mejor esfuerzo de
 * distancia y tiempo en cardio. `null` si no hay datos suficientes.
 */
export function summarizeSets(
  workoutType: WorkoutType,
  sets: readonly NormalizedSet[],
): string | null {
  if (workoutType === 'STRENGTH' || workoutType === 'CUSTOM') {
    const volume = totalVolumeKg(sets);
    return volume > 0 ? `Volumen ${formatRecordValue('WEIGHT', volume)}` : null;
  }
  if (workoutType === 'CARDIO') {
    const longest = [...sets]
      .filter((set) => set.distanceMeters !== null)
      .sort((a, b) => (b.distanceMeters ?? 0) - (a.distanceMeters ?? 0))[0];
    if (!longest) return null;
    const distance = formatRecordValue(
      'DISTANCE',
      longest.distanceMeters ?? 0,
      longest.distanceMeters! >= 1000 ? 'KILOMETER' : 'METER',
    );
    return longest.durationSeconds !== null
      ? `${distance} · ${formatDuration(longest.durationSeconds)}`
      : distance;
  }
  return null;
}

// --- Marcas personales derivadas ---------------------------------------------------------

/** Serie de un ejercicio con lo necesario para derivar marcas. */
export interface ResultForRecords extends SetPerformance {
  /** Id del resultado persistido: queda enlazado a la marca que origine. */
  resultId: string;
  setNumber: number;
}

export interface ExerciseForRecords {
  movementId: string;
  /** Tipos de marca que admite el movimiento (`Movement.recordTypes`). */
  recordTypes: readonly RecordType[];
  results: readonly ResultForRecords[];
}

/** Marca que un resultado permitiría registrar. */
export interface RecordCandidate {
  resultId: string;
  movementId: string;
  recordType: RecordType;
  value: number;
  unit: 'KILOGRAM' | 'POUND' | 'REPETITION' | 'METER' | 'KILOMETER' | 'MILE' | 'SECOND';
  normalizedValue: number;
  repetitions: number | null;
  /** Calificador de TIME; `null` en el resto. */
  distanceValue: number | null;
  distanceUnit: DistanceUnit | null;
  distanceMeters: number | null;
}

/**
 * Tipos de entrenamiento que generan marcas por movimiento. En FOR_TIME, AMRAP y EMOM la carga
 * o las repeticiones de cada ronda no son un intento máximo, así que no se tratan como marca.
 */
export const RECORD_GENERATING_WORKOUT_TYPES: readonly WorkoutType[] = ['STRENGTH', 'CARDIO'];

/**
 * Candidatos a marca de un entrenamiento, uno por serie comparable (el mejor de cada una; ante
 * empate, la primera serie). Reglas (ADR 0008):
 * - STRENGTH: carga + reps (1..100) → WEIGHT con esas repeticiones; reps sin carga → REPS;
 *   sólo duración → DURATION.
 * - CARDIO: distancia + duración → TIME calificado por la distancia; distancia → DISTANCE;
 *   sólo duración → DURATION.
 * Sólo se proponen tipos que el movimiento admite.
 */
export function recordCandidates(
  workoutType: WorkoutType,
  exercises: readonly ExerciseForRecords[],
): RecordCandidate[] {
  if (!RECORD_GENERATING_WORKOUT_TYPES.includes(workoutType)) return [];

  const bestByKey = new Map<string, RecordCandidate>();
  for (const exercise of exercises) {
    const ordered = [...exercise.results].sort((a, b) => a.setNumber - b.setNumber);
    for (const result of ordered) {
      for (const candidate of candidatesForResult(workoutType, exercise, result)) {
        const key = candidateKey(candidate);
        const current = bestByKey.get(key);
        if (
          !current ||
          isBetter(candidate.recordType, candidate.normalizedValue, current.normalizedValue)
        ) {
          bestByKey.set(key, candidate);
        }
      }
    }
  }
  return [...bestByKey.values()];
}

function candidatesForResult(
  workoutType: WorkoutType,
  exercise: ExerciseForRecords,
  result: ResultForRecords,
): RecordCandidate[] {
  const { value: set, errors } = normalizeSet(result);
  if (errors.length > 0) return [];
  const allows = (type: RecordType) => exercise.recordTypes.includes(type);
  const base = {
    resultId: result.resultId,
    movementId: exercise.movementId,
    repetitions: null,
    distanceValue: null,
    distanceUnit: null,
    distanceMeters: null,
  };
  const candidates: RecordCandidate[] = [];

  if (workoutType === 'STRENGTH') {
    if (
      set.loadKg !== null &&
      set.reps !== null &&
      set.reps >= 1 &&
      set.reps <= 100 &&
      allows('WEIGHT')
    ) {
      candidates.push({
        ...base,
        recordType: 'WEIGHT',
        value: result.loadValue as number,
        unit: result.loadUnit as LoadUnit,
        normalizedValue: set.loadKg,
        repetitions: set.reps,
      });
    } else if (set.loadKg === null && set.reps !== null && set.reps >= 1 && allows('REPS')) {
      candidates.push({
        ...base,
        recordType: 'REPS',
        value: set.reps,
        unit: 'REPETITION',
        normalizedValue: set.reps,
      });
    } else if (
      set.reps === null &&
      set.loadKg === null &&
      set.distanceMeters === null &&
      set.durationSeconds !== null &&
      allows('DURATION')
    ) {
      candidates.push(durationCandidate(base, set.durationSeconds));
    }
  }

  if (workoutType === 'CARDIO') {
    if (set.distanceMeters !== null && set.durationSeconds !== null && allows('TIME')) {
      candidates.push({
        ...base,
        recordType: 'TIME',
        value: set.durationSeconds,
        unit: 'SECOND',
        normalizedValue: set.durationSeconds,
        distanceValue: result.distanceValue,
        distanceUnit: result.distanceUnit,
        distanceMeters: set.distanceMeters,
      });
    }
    if (set.distanceMeters !== null && allows('DISTANCE')) {
      candidates.push({
        ...base,
        recordType: 'DISTANCE',
        value: result.distanceValue as number,
        unit: result.distanceUnit as DistanceUnit,
        normalizedValue: set.distanceMeters,
      });
    }
    if (set.distanceMeters === null && set.durationSeconds !== null && allows('DURATION')) {
      candidates.push(durationCandidate(base, set.durationSeconds));
    }
  }
  return candidates;
}

function durationCandidate(
  base: Omit<RecordCandidate, 'recordType' | 'value' | 'unit' | 'normalizedValue'>,
  seconds: number,
): RecordCandidate {
  return {
    ...base,
    recordType: 'DURATION',
    value: seconds,
    unit: 'SECOND',
    normalizedValue: seconds,
  };
}

/** Clave de comparación: movimiento + serie comparable de @garfit/domain/records. */
export function candidateKey(entry: {
  movementId: string;
  recordType: RecordType;
  repetitions: number | null;
  distanceMeters: number | null;
}): string {
  return `${entry.movementId}|${seriesKey(entry)}`;
}

/** Historial existente de un movimiento, para comparar candidatos. */
export interface MovementHistory {
  movementId: string;
  entries: readonly Pick<
    RecordEntry,
    'recordType' | 'repetitions' | 'distanceMeters' | 'normalizedValue'
  >[];
}

/**
 * Filtra los candidatos que son nueva mejor marca: no hay historial en su serie o lo superan
 * estrictamente (igualar no es marca). Devuelve además la mejor marca previa para mostrar el
 * cambio ("115 → 120 kg").
 */
export function selectNewRecords(
  candidates: readonly RecordCandidate[],
  history: readonly MovementHistory[],
): { candidate: RecordCandidate; previousBest: number | null }[] {
  const bestByKey = new Map<string, number>();
  for (const movement of history) {
    for (const entry of movement.entries) {
      const key = candidateKey({ movementId: movement.movementId, ...entry });
      const current = bestByKey.get(key);
      if (current === undefined || isBetter(entry.recordType, entry.normalizedValue, current)) {
        bestByKey.set(key, entry.normalizedValue);
      }
    }
  }

  return candidates.flatMap((candidate) => {
    const previousBest = bestByKey.get(candidateKey(candidate)) ?? null;
    const isNew =
      previousBest === null ||
      isBetter(candidate.recordType, candidate.normalizedValue, previousBest);
    return isNew ? [{ candidate, previousBest }] : [];
  });
}

// --- Estadísticas ------------------------------------------------------------------------

/** Cuántas fechas (`YYYY-MM-DD`) caen en los últimos `days` días, incluyendo hoy. */
export function countInLastDays(
  dates: readonly string[],
  days: number,
  now: Date = new Date(),
): number {
  const today = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return dates.filter((date) => isValidIsoDate(date) && date >= from && date <= today).length;
}

/**
 * Entrenamientos por semana de las últimas `weeks` semanas (bloques de 7 días hacia atrás desde
 * hoy); el último elemento es la semana más reciente.
 */
export function countPerWeek(
  dates: readonly string[],
  weeks: number,
  now: Date = new Date(),
): number[] {
  return Array.from({ length: weeks }, (_, index) => {
    const weekIndex = weeks - 1 - index;
    const end = new Date(now.getTime() - weekIndex * 7 * 86_400_000).toISOString().slice(0, 10);
    const start = new Date(now.getTime() - (weekIndex * 7 + 6) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return dates.filter((date) => date >= start && date <= end).length;
  });
}
