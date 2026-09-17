import type { RecordType, RecordUnit } from './rules.js';
import { DISTANCE_QUALIFIED_RECORD_TYPES } from './rules.js';
import { roundTo } from './units.js';

/**
 * Cálculo determinista de marcas personales. Nada aquí usa IA: qué es una mejor marca, la marca
 * actual y el progreso se derivan sólo de los registros del atleta.
 */

/** Registro mínimo necesario para calcular progreso. Fechas en ISO (`YYYY-MM-DD` o completa). */
export interface RecordEntry {
  id: string;
  recordType: RecordType;
  /** Valor tal como se introdujo, en `unit`. */
  value: number;
  unit: RecordUnit;
  /** Valor en unidad canónica (kg, repeticiones, metros o segundos). Se compara con éste. */
  normalizedValue: number;
  /** Repeticiones de una marca de carga (1 = 1RM). `null` en otros tipos. */
  repetitions: number | null;
  /**
   * Calificador de distancia en metros para tipos que lo exigen (TIME): la distancia sobre la
   * que se midió el tiempo. `null` en el resto.
   */
  distanceMeters: number | null;
  performedAt: string;
  createdAt: string;
}

/** `true` si el tipo de marca sólo es comparable sobre la misma distancia. */
export function requiresDistanceQualifier(recordType: RecordType): boolean {
  return DISTANCE_QUALIFIED_RECORD_TYPES.includes(recordType);
}

/** `TIME` mejora al bajar; el resto, al subir. */
export function lowerIsBetter(recordType: RecordType): boolean {
  return recordType === 'TIME';
}

/** `true` si `candidate` supera estrictamente a `reference`. */
export function isBetter(recordType: RecordType, candidate: number, reference: number): boolean {
  return lowerIsBetter(recordType) ? candidate < reference : candidate > reference;
}

/**
 * Una serie agrupa marcas comparables entre sí: mismo tipo y, además,
 * - en cargas, mismo número de repeticiones (un 5RM no se compara con un 1RM);
 * - en tipos calificados por distancia, misma distancia (`TIME@5000m` ≠ `TIME@10000m`).
 * Un TIME sin distancia (registros anteriores a la fase 3) forma su propia serie `TIME`.
 */
export function seriesKey(
  entry: Pick<RecordEntry, 'recordType' | 'repetitions'> &
    Partial<Pick<RecordEntry, 'distanceMeters'>>,
): string {
  if (entry.recordType === 'WEIGHT') return `WEIGHT:${entry.repetitions ?? 1}`;
  if (requiresDistanceQualifier(entry.recordType) && entry.distanceMeters != null) {
    return `${entry.recordType}@${roundTo(entry.distanceMeters, 3)}m`;
  }
  return entry.recordType;
}

/** Orden cronológico estable: fecha de realización y, a igual fecha, fecha de registro. */
export function compareChronologically(a: RecordEntry, b: RecordEntry): number {
  return a.performedAt.localeCompare(b.performedAt) || a.createdAt.localeCompare(b.createdAt);
}

export interface Change {
  /** Diferencia en unidad canónica (`nuevo − anterior`). */
  absolute: number;
  /** Porcentaje respecto al anterior; `null` si el anterior es 0. */
  percent: number | null;
  /** `true` si el cambio es una mejora según la dirección del tipo de marca. */
  improved: boolean;
}

export function computeChange(recordType: RecordType, from: number, to: number): Change {
  const absolute = roundTo(to - from, 3);
  return {
    absolute,
    percent: from === 0 ? null : roundTo((absolute / from) * 100, 1),
    improved: isBetter(recordType, to, from),
  };
}

export interface HistoryPoint extends RecordEntry {
  /** `true` si al registrarse superó todas las marcas anteriores de la serie. */
  isPersonalBest: boolean;
}

export interface RecordSeriesSummary {
  key: string;
  recordType: RecordType;
  repetitions: number | null;
  /** Distancia que califica la serie (TIME); `null` si el tipo no la usa. */
  distanceMeters: number | null;
  count: number;
  first: RecordEntry;
  /** Registro más reciente. */
  current: RecordEntry;
  /** Mejor registro histórico (ante empate, el primero que lo alcanzó). */
  best: RecordEntry;
  /** Cambio del registro anterior al actual. `null` si sólo hay uno. */
  changeFromPrevious: Change | null;
  /** Cuánto mejoró la mejor marca respecto a la mejor marca previa. `null` si no hubo previa. */
  bestImprovement: Change | null;
  /** Cambio entre el primer registro y el mejor. `null` si sólo hay uno. */
  totalProgress: Change | null;
  history: HistoryPoint[];
}

/** Resume una serie homogénea. Lanza si está vacía o mezcla series distintas. */
export function summarizeSeries(entries: readonly RecordEntry[]): RecordSeriesSummary {
  const [head] = entries;
  if (!head) throw new Error('Una serie necesita al menos un registro');
  const key = seriesKey(head);
  if (entries.some((entry) => seriesKey(entry) !== key)) {
    throw new Error('La serie mezcla tipos de marca, repeticiones o distancias distintas');
  }

  const ordered = [...entries].sort(compareChronologically);
  const { recordType } = head;

  let best: RecordEntry | undefined;
  let previousBest: RecordEntry | undefined;
  const history: HistoryPoint[] = ordered.map((entry) => {
    const isPersonalBest =
      !best || isBetter(recordType, entry.normalizedValue, best.normalizedValue);
    if (isPersonalBest) {
      previousBest = best;
      best = entry;
    }
    return { ...entry, isPersonalBest };
  });

  const first = ordered[0] as RecordEntry;
  const current = ordered[ordered.length - 1] as RecordEntry;
  const previous = ordered.length > 1 ? (ordered[ordered.length - 2] as RecordEntry) : null;
  const bestEntry = best as RecordEntry;

  return {
    key,
    recordType,
    repetitions: recordType === 'WEIGHT' ? (head.repetitions ?? 1) : null,
    distanceMeters: requiresDistanceQualifier(recordType) ? head.distanceMeters : null,
    count: ordered.length,
    first,
    current,
    best: bestEntry,
    changeFromPrevious: previous
      ? computeChange(recordType, previous.normalizedValue, current.normalizedValue)
      : null,
    bestImprovement: previousBest
      ? computeChange(recordType, previousBest.normalizedValue, bestEntry.normalizedValue)
      : null,
    totalProgress:
      ordered.length > 1
        ? computeChange(recordType, first.normalizedValue, bestEntry.normalizedValue)
        : null,
    history,
  };
}

/** Agrupa registros heterogéneos en series y resume cada una (orden: tipo, repeticiones). */
export function summarizeAll(entries: readonly RecordEntry[]): RecordSeriesSummary[] {
  const groups = new Map<string, RecordEntry[]>();
  for (const entry of entries) {
    const key = seriesKey(entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.values()]
    .map((group) => summarizeSeries(group))
    .sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
}
