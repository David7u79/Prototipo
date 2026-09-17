import type { DistanceUnit, HistoryPoint, RecordEntry, RecordSeriesSummary } from '@garfit/domain';
import { lowerIsBetter } from '@garfit/domain';
import { toIsoDate } from '../common/iso-date.js';
import type { Movement, PersonalRecord, WorkoutResult } from '../generated/prisma/client.js';
import type {
  MovementRefResponse,
  PersonalRecordResponse,
  RecordHistoryEntryResponse,
  RecordSeriesResponse,
  RecordSeriesWithHistoryResponse,
} from './dto/record-responses.dto.js';

type RecordOriginRow = WorkoutResult & {
  workoutExercise: { workout: { id: string; name: string; performedOn: Date | null } };
};

export type RecordRow = PersonalRecord & {
  movement: Movement;
  workoutResult?: RecordOriginRow | null;
};

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
    distanceValue: row.distanceValue === null ? null : Number(row.distanceValue),
    distanceUnit: toDistanceUnit(row.distanceUnit),
    distanceMeters: row.distanceMeters === null ? null : Number(row.distanceMeters),
    performedAt: toIsoDate(row.performedAt),
    notes: row.notes,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPersonalRecord(row: RecordRow): PersonalRecordResponse {
  const origin = row.workoutResult
    ? {
        workoutId: row.workoutResult.workoutExercise.workout.id,
        workoutName: row.workoutResult.workoutExercise.workout.name,
        performedOn: toIsoDate(row.workoutResult.workoutExercise.workout.performedOn!),
        setNumber: row.workoutResult.setNumber,
        reps: row.workoutResult.reps,
      }
    : null;
  return { ...toRecordFields(row), movement: toMovementRef(row.movement), origin };
}

/**
 * Serializa una serie calculada. El cálculo trabaja con `RecordEntry` (sin notas ni origen);
 * `rowsById` recupera la fila completa de cada entrada para devolver el contrato entero.
 */
export function toSeriesResponse(
  series: RecordSeriesSummary,
  rowsById: ReadonlyMap<string, RecordRow>,
): RecordSeriesResponse {
  const personalBests = new Set(
    series.history.filter((point) => point.isPersonalBest).map((point) => point.id),
  );
  const entry = (item: RecordEntry): RecordHistoryEntryResponse => ({
    ...toPersonalRecord(rowOf(item.id, rowsById)),
    isPersonalBest: personalBests.has(item.id),
  });
  return {
    key: series.key,
    recordType: series.recordType,
    repetitions: series.repetitions,
    distanceMeters: numberOrNull(rowOf(series.first.id, rowsById).distanceMeters),
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

function numberOrNull(value: { toString(): string } | null): number | null {
  return value === null ? null : Number(value);
}

function toDistanceUnit(value: PersonalRecord['distanceUnit']): DistanceUnit | null {
  return value === 'METER' || value === 'KILOMETER' || value === 'MILE' ? value : null;
}

export function toSeriesWithHistory(
  series: RecordSeriesSummary,
  rowsById: ReadonlyMap<string, RecordRow>,
): RecordSeriesWithHistoryResponse {
  const history = series.history.map((point: HistoryPoint) => ({
    ...toPersonalRecord(rowOf(point.id, rowsById)),
    isPersonalBest: point.isPersonalBest,
  }));
  return { ...toSeriesResponse(series, rowsById), history };
}

function rowOf(id: string, rowsById: ReadonlyMap<string, RecordRow>): RecordRow {
  const row = rowsById.get(id);
  if (!row) throw new Error(`Registro ${id} ausente al serializar la serie`);
  return row;
}
