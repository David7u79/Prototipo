import type { RecordEntry, RecordSeriesSummary } from './records.js';
import { summarizeAll } from './records.js';
import type { ExperienceLevel, PrimaryGoal, RecordType, UnitSystem } from './rules.js';
import { ageInYears } from './dates.js';

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
  };
  records: MovementRecordSummary[];
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
  entries: RecordEntry[];
}

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
    canonicalUnit: CANONICAL[series.recordType],
    lowerIsBetter: series.recordType === 'TIME',
    entries: series.count,
    first: point(series.first),
    current: point(series.current),
    best: point(series.best),
    absoluteProgress: series.totalProgress?.absolute ?? null,
    percentProgress: series.totalProgress?.percent ?? null,
  };
}

/** Construye la instantánea de progreso a partir de datos ya leídos de la base. */
export function buildProgressSnapshot(
  profile: SnapshotProfileInput | null,
  movements: readonly SnapshotMovementRecords[],
  now: Date = new Date(),
): AthleteProgressSnapshot {
  const withEntries = movements.filter((movement) => movement.entries.length > 0);
  const records = withEntries.flatMap((movement) =>
    summarizeAll(movement.entries).map((series) => toSummary(movement, series)),
  );

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
      records: withEntries.reduce((total, movement) => total + movement.entries.length, 0),
    },
    records,
  };
}
