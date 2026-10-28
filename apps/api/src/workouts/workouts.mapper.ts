export function toWorkoutMovementRef(movement: {
  slug: string;
  name: string;
  category: string;
  equipment: string;
}) {
  return {
    slug: movement.slug,
    name: movement.name,
    category: movement.category,
    equipment: movement.equipment,
  };
}

export function toDerivedPersonalRecords(rows: RecordRow[], workoutResultIds: Set<string>) {
  const histories = new Map<string, RecordRow[]>();
  for (const row of rows) {
    const entry = toRecordEntry(row);
    const key = `${row.movementId}|${entry.recordType}|${entry.repetitions}|${entry.distanceMeters}`;
    histories.set(key, [...(histories.get(key) ?? []), row]);
  }
  return rows.flatMap((row) => {
    if (!row.workoutResultId || !workoutResultIds.has(row.workoutResultId)) return [];
    const entry = toRecordEntry(row);
    const key = `${row.movementId}|${entry.recordType}|${entry.repetitions}|${entry.distanceMeters}`;
    const summary = summarizeSeries((histories.get(key) ?? []).map(toRecordEntry));
    const pointIndex = summary.history.findIndex((point) => point.id === row.id);
    const previous = summary.history
      .slice(0, pointIndex)
      .filter((point) => point.isPersonalBest)
      .at(-1);
    return [
      {
        record: toPersonalRecord(row),
        previousBest: previous?.normalizedValue ?? null,
        change: previous
          ? computeChange(row.recordType, previous.normalizedValue, entry.normalizedValue)
          : null,
      },
    ];
  });
}
import { computeChange, summarizeSeries } from '@garfit/domain';
import type { BiometricSource, WorkoutBiometrics } from '@garfit/types';
import { toPersonalRecord, toRecordEntry, type RecordRow } from '../records/records.mapper.js';

export function toWorkoutBiometrics(
  row: {
    avgHeartRateBpm: number | null;
    maxHeartRateBpm: number | null;
    activeCaloriesKcal: number | null;
    startedAt: Date;
    endedAt: Date;
    source: BiometricSource;
    externalId: string | null;
    updatedAt: Date;
  } | null,
): WorkoutBiometrics | null {
  if (!row) return null;
  return {
    avgHeartRateBpm: row.avgHeartRateBpm ?? null,
    maxHeartRateBpm: row.maxHeartRateBpm ?? null,
    activeCaloriesKcal: row.activeCaloriesKcal ?? null,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    source: row.source,
    externalId: row.externalId ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
