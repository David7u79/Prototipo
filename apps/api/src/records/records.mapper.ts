import type { HistoryPoint, RecordEntry, RecordSeriesSummary } from '@garfit/domain';
import { lowerIsBetter } from '@garfit/domain';
import { toIsoDate } from '../common/iso-date.js';
import type { Movement, PersonalRecord } from '../generated/prisma/client.js';
import type {
  MovementRefResponse,
  PersonalRecordResponse,
  RecordHistoryEntryResponse,
  RecordSeriesResponse,
  RecordSeriesWithHistoryResponse,
} from './dto/record-responses.dto.js';

export type RecordRow = PersonalRecord & { movement: Movement };

/** Fila de BD → entrada que entiende el cálculo de @garfit/domain. */
export function toRecordEntry(row: PersonalRecord): RecordEntry {
  return {
    id: row.id,
    recordType: row.recordType,
    value: Number(row.value),
    unit: row.unit,
    normalizedValue: Number(row.normalizedValue),
    repetitions: row.repetitions,
    distanceMeters: row.distanceMeters === null ? null : Number(row.distanceMeters),
    performedAt: toIsoDate(row.performedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toMovementRef(movement: Movement): MovementRefResponse {
  return {
    slug: movement.slug,
    name: movement.name,
    category: movement.category,
    equipment: movement.equipment,
  };
}

function toRecordFields(row: PersonalRecord) {
  return {
    id: row.id,
    recordType: row.recordType,
    value: Number(row.value),
    unit: row.unit,
    normalizedValue: Number(row.normalizedValue),
    repetitions: row.repetitions,
    performedAt: toIsoDate(row.performedAt),
    notes: row.notes,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPersonalRecord(row: RecordRow): PersonalRecordResponse {
  return { ...toRecordFields(row), movement: toMovementRef(row.movement) };
}

/**
 * Serializa una serie calculada. El cálculo trabaja con `RecordEntry` (sin notas ni origen);
 * `rowsById` recupera la fila completa de cada entrada para devolver el contrato entero.
 */
export function toSeriesResponse(
  series: RecordSeriesSummary,
  rowsById: ReadonlyMap<string, PersonalRecord>,
): RecordSeriesResponse {
  const personalBests = new Set(
    series.history.filter((point) => point.isPersonalBest).map((point) => point.id),
  );
  const entry = (item: RecordEntry): RecordHistoryEntryResponse => ({
    ...toRecordFields(rowOf(item.id, rowsById)),
    isPersonalBest: personalBests.has(item.id),
  });
  return {
    key: series.key,
    recordType: series.recordType,
    repetitions: series.repetitions,
    lowerIsBetter: lowerIsBetter(series.recordType),
    count: series.count,
    first: entry(series.first),
    current: entry(series.current),
    best: entry(series.best),
    changeFromPrevious: series.changeFromPrevious,
    bestImprovement: series.bestImprovement,
    totalProgress: series.totalProgress,
  };
}

export function toSeriesWithHistory(
  series: RecordSeriesSummary,
  rowsById: ReadonlyMap<string, PersonalRecord>,
): RecordSeriesWithHistoryResponse {
  const history = series.history.map((point: HistoryPoint) => ({
    ...toRecordFields(rowOf(point.id, rowsById)),
    isPersonalBest: point.isPersonalBest,
  }));
  return { ...toSeriesResponse(series, rowsById), history };
}

function rowOf(id: string, rowsById: ReadonlyMap<string, PersonalRecord>): PersonalRecord {
  const row = rowsById.get(id);
  if (!row) throw new Error(`Registro ${id} ausente al serializar la serie`);
  return row;
}
