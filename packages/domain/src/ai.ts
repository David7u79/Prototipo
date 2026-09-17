import type { AthleteProgressSnapshot, MovementRecordSummary } from './progress-snapshot.js';
import type { RecordType, WorkoutType } from './rules.js';
import type { NormalizedSet, WorkoutScore } from './workouts.js';
import { countInLastDays, formatScore, totalVolumeKg } from './workouts.js';

/**
 * Contexto y evidencia para la capa de IA. Regla central: GarFit calcula, el modelo interpreta.
 * Cada dato que el modelo puede citar es un `AiEvidenceFact` con un identificador estable que
 * genera este módulo; el modelo sólo devuelve identificadores y la API resuelve los valores
 * visibles desde aquí. Nada en este fichero depende de un proveedor de IA concreto.
 */

export const AI_ANALYSIS_TYPES = [
  'PROGRESS_ANALYSIS',
  'WORKOUT_ANALYSIS',
  'WOD_EXPLANATION',
  'MOVEMENT_EXPLANATION',
] as const;
export type AiAnalysisType = (typeof AI_ANALYSIS_TYPES)[number];

export const AI_PERIOD_DAYS = [30, 60, 90] as const;
export type AiPeriodDays = (typeof AI_PERIOD_DAYS)[number];
export const DEFAULT_AI_PERIOD_DAYS: AiPeriodDays = 30;

export const AI_EVIDENCE_CATEGORIES = [
  'PROFILE',
  'ACTIVITY',
  'PERSONAL_RECORD',
  'VOLUME',
  'WORKOUT',
  'HISTORY',
  'WOD',
  'MOVEMENT',
] as const;
export type AiEvidenceCategory = (typeof AI_EVIDENCE_CATEGORIES)[number];

/** Dato verificable que GarFit calculó y que el modelo puede citar por `id`. */
export interface AiEvidenceFact {
  /** Estable y determinista para los mismos datos, p. ej. `pr:back-squat:weight-5rm:best`. */
  id: string;
  category: AiEvidenceCategory;
  label: string;
  value: string | number;
  unit?: string;
  /** Fecha ISO `YYYY-MM-DD` del hecho, si la tiene. */
  occurredAt?: string;
}

/** Resumen visible de qué datos alimentaron el análisis (transparencia para el atleta). */
export interface AiDataUsed {
  label: string;
  value: string | number;
}

/** Todo lo que se envía al modelo para una operación, y si merece la pena llamarlo. */
export interface AiContextBundle {
  /** `false` si se sabe de antemano que no hay datos suficientes: no se llama al proveedor. */
  sufficient: boolean;
  facts: AiEvidenceFact[];
  dataUsed: AiDataUsed[];
}

/** Límites del contexto: acotan el tamaño del prompt y lo que sale hacia el proveedor. */
export const AI_CONTEXT_LIMITS = {
  recordSeries: 12,
  volumeMovements: 10,
  recentWorkouts: 8,
  instructions: 12,
  textLength: 500,
} as const;

/** Salida estructurada que se exige al modelo (se valida con Zod en `@garfit/validation`). */
export interface AiModelItem {
  title: string;
  description: string;
  evidenceIds: string[];
}

export interface AiModelOutput {
  status: 'COMPLETED' | 'INSUFFICIENT_DATA';
  summary: string;
  observations: AiModelItem[];
  suggestions: AiModelItem[];
  limitations: string[];
  missingData: string[];
}

/**
 * Serialización JSON con claves ordenadas: la misma información produce siempre el mismo
 * texto, requisito para calcular el hash del contexto que usa la caché de análisis.
 */
export function stableStringify(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? 'null' : stableStringify(item))).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

/** Identificadores de evidencia citados que no existen en el conjunto enviado (sin repetir). */
export function unknownEvidenceIds(
  output: Pick<AiModelOutput, 'observations' | 'suggestions'>,
  facts: readonly AiEvidenceFact[],
): string[] {
  const known = new Set(facts.map((fact) => fact.id));
  const cited = [...output.observations, ...output.suggestions].flatMap((item) => item.evidenceIds);
  return [...new Set(cited.filter((id) => !known.has(id)))].sort();
}

/** Resuelve identificadores a los hechos calculados por GarFit, en el orden citado y sin duplicar. */
export function resolveEvidence(
  ids: readonly string[],
  facts: readonly AiEvidenceFact[],
): AiEvidenceFact[] {
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  return [...new Set(ids)].flatMap((id) => {
    const fact = byId.get(id);
    return fact ? [fact] : [];
  });
}

const CANONICAL_UNIT_SYMBOL: Record<RecordType, string> = {
  WEIGHT: 'kg',
  REPS: 'reps',
  DISTANCE: 'm',
  DURATION: 's',
  TIME: 's',
};

/** Parte del identificador que distingue series comparables: `weight-5rm`, `time-5000m`, `reps`. */
export function seriesSlug(series: {
  recordType: RecordType;
  repetitions: number | null;
  distanceMeters: number | null;
}): string {
  if (series.recordType === 'WEIGHT') return `weight-${series.repetitions ?? 1}rm`;
  if (series.recordType === 'TIME' && series.distanceMeters !== null) {
    return `time-${series.distanceMeters}m`;
  }
  return series.recordType.toLowerCase();
}

function seriesLabel(
  movementName: string,
  series: { recordType: RecordType; repetitions: number | null; distanceMeters: number | null },
): string {
  switch (series.recordType) {
    case 'WEIGHT':
      return `${movementName} ${series.repetitions ?? 1}RM`;
    case 'TIME':
      return series.distanceMeters === null
        ? `${movementName} (tiempo)`
        : `${movementName} (tiempo en ${series.distanceMeters} m)`;
    case 'REPS':
      return `${movementName} (repeticiones)`;
    case 'DISTANCE':
      return `${movementName} (distancia)`;
    case 'DURATION':
      return `${movementName} (duración)`;
  }
}

/** Texto aportado por el usuario: se recorta y se trata siempre como dato, nunca como instrucción. */
function clip(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > AI_CONTEXT_LIMITS.textLength
    ? `${trimmed.slice(0, AI_CONTEXT_LIMITS.textLength)}…`
    : trimmed;
}

/** Acumula hechos garantizando identificadores únicos. */
class FactList {
  readonly facts: AiEvidenceFact[] = [];
  private readonly ids = new Set<string>();

  add(fact: AiEvidenceFact): void {
    if (this.ids.has(fact.id)) throw new Error(`Identificador de evidencia duplicado: ${fact.id}`);
    this.ids.add(fact.id);
    this.facts.push(fact);
  }

  addText(fact: Omit<AiEvidenceFact, 'value'> & { value: string | null }): void {
    if (fact.value === null || fact.value.trim() === '') return;
    this.add({ ...fact, value: clip(fact.value) });
  }
}

/** Numera por fecha: `2026-09-17:1`, `2026-09-17:2`… en el orden recibido. */
function dateKeys(dates: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return dates.map((date) => {
    const index = (seen.get(date) ?? 0) + 1;
    seen.set(date, index);
    return `${date}:${index}`;
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Análisis de progreso                                                                        */
/* ------------------------------------------------------------------------------------------ */

function addSeriesFacts(
  list: FactList,
  series: MovementRecordSummary,
  days: number,
  now: Date,
): void {
  const base = `pr:${series.movementSlug}:${seriesSlug(series)}`;
  const name = seriesLabel(series.movementName, series);
  const unit = CANONICAL_UNIT_SYMBOL[series.recordType];
  list.add({
    id: `${base}:best`,
    category: 'PERSONAL_RECORD',
    label: `Mejor marca — ${name}`,
    value: series.best.value,
    unit,
    occurredAt: series.best.performedAt,
  });
  if (series.entries > 1) {
    list.add({
      id: `${base}:first`,
      category: 'PERSONAL_RECORD',
      label: `Primer registro — ${name}`,
      value: series.first.value,
      unit,
      occurredAt: series.first.performedAt,
    });
  }
  if (series.absoluteProgress !== null) {
    list.add({
      id: `${base}:total-progress`,
      category: 'PERSONAL_RECORD',
      label: `Progreso del primer registro a la mejor marca — ${name}`,
      value: series.absoluteProgress,
      unit,
    });
  }
  if (series.percentProgress !== null) {
    list.add({
      id: `${base}:total-progress-percent`,
      category: 'PERSONAL_RECORD',
      label: `Progreso porcentual del primer registro a la mejor marca — ${name}`,
      value: series.percentProgress,
      unit: '%',
    });
  }
  const inPeriod = series.recentHistory.filter(
    (entry) => countInLastDays([entry.performedAt], days, now) === 1,
  );
  const keys = dateKeys(inPeriod.map((entry) => entry.performedAt));
  inPeriod.forEach((entry, index) => {
    list.add({
      id: `${base}:entry:${keys[index]}`,
      category: 'PERSONAL_RECORD',
      label: entry.isPersonalBest ? `Registro (nueva mejor marca) — ${name}` : `Registro — ${name}`,
      value: entry.value,
      unit,
      occurredAt: entry.performedAt,
    });
  });
}

/**
 * Contexto del análisis de progreso a partir de la instantánea (construida con el mismo
 * periodo). Sólo datos deportivos agregados: sin nombre, correo, fecha de nacimiento ni ids.
 */
export function buildProgressContext(snapshot: AthleteProgressSnapshot): AiContextBundle {
  const list = new FactList();
  const now = new Date(snapshot.generatedAt);
  const days = snapshot.period.days;
  const { athlete, trends, period } = snapshot;

  if (athlete.experienceLevel) {
    list.add({
      id: 'profile:experience-level',
      category: 'PROFILE',
      label: 'Nivel de experiencia',
      value: athlete.experienceLevel,
    });
  }
  if (athlete.primaryGoal) {
    list.add({
      id: 'profile:primary-goal',
      category: 'PROFILE',
      label: 'Objetivo principal',
      value: athlete.primaryGoal,
    });
  }
  list.add({
    id: 'profile:preferred-units',
    category: 'PROFILE',
    label: 'Sistema de unidades preferido',
    value: athlete.preferredUnits,
  });
  if (athlete.trainingYears !== null) {
    list.add({
      id: 'profile:training-years',
      category: 'PROFILE',
      label: 'Años entrenando',
      value: athlete.trainingYears,
      unit: 'años',
    });
  }

  list.add({
    id: 'activity:workouts:last-7-days',
    category: 'ACTIVITY',
    label: 'Entrenamientos completados en los últimos 7 días',
    value: trends.workoutsLast7Days,
  });
  if (days !== 7) {
    list.add({
      id: `activity:workouts:last-${days}-days`,
      category: 'ACTIVITY',
      label: `Entrenamientos completados en los últimos ${days} días`,
      value: period.completedWorkouts,
    });
  }
  trends.workoutsPerWeek.forEach((count, index) => {
    const weeksAgo = trends.workoutsPerWeek.length - 1 - index;
    list.add({
      id: `activity:workouts:weeks-ago-${weeksAgo}`,
      category: 'ACTIVITY',
      label:
        weeksAgo === 0
          ? 'Entrenamientos completados esta semana'
          : `Entrenamientos completados hace ${weeksAgo} ${weeksAgo === 1 ? 'semana' : 'semanas'}`,
      value: count,
    });
  });
  list.add({
    id: `activity:records:last-${days}-days`,
    category: 'ACTIVITY',
    label: `Marcas personales registradas en los últimos ${days} días`,
    value: period.personalRecords,
  });
  list.add({
    id: `activity:records-from-workouts:last-${days}-days`,
    category: 'ACTIVITY',
    label: `Marcas personales generadas por entrenamientos en los últimos ${days} días`,
    value: period.personalRecordsFromWorkouts,
  });

  const series = [...snapshot.records]
    .sort(
      (a, b) =>
        b.current.performedAt.localeCompare(a.current.performedAt) ||
        a.movementSlug.localeCompare(b.movementSlug) ||
        seriesSlug(a).localeCompare(seriesSlug(b)),
    )
    .slice(0, AI_CONTEXT_LIMITS.recordSeries);
  for (const item of series) addSeriesFacts(list, item, days, now);

  const volumes = period.volumeByMovement.slice(0, AI_CONTEXT_LIMITS.volumeMovements);
  for (const volume of volumes) {
    list.add({
      id: `volume:${volume.movementSlug}:last-${days}-days`,
      category: 'VOLUME',
      label: `Volumen de ${volume.movementName} en los últimos ${days} días`,
      value: volume.volumeKg,
      unit: 'kg',
    });
  }

  const workouts = snapshot.recentWorkouts
    .filter((workout) => countInLastDays([workout.performedOn], days, now) === 1)
    .slice(0, AI_CONTEXT_LIMITS.recentWorkouts);
  const keys = dateKeys(workouts.map((workout) => workout.performedOn));
  workouts.forEach((workout, index) => {
    const base = `recent-workout:${keys[index]}`;
    const occurredAt = workout.performedOn;
    list.addText({
      id: `${base}:name`,
      category: 'WORKOUT',
      label: 'Nombre del entrenamiento',
      value: workout.name,
      occurredAt,
    });
    list.add({
      id: `${base}:type`,
      category: 'WORKOUT',
      label: 'Tipo de entrenamiento',
      value: workout.workoutType,
      occurredAt,
    });
    if (workout.volumeKg > 0) {
      list.add({
        id: `${base}:volume`,
        category: 'WORKOUT',
        label: 'Volumen del entrenamiento',
        value: workout.volumeKg,
        unit: 'kg',
        occurredAt,
      });
    }
    if (workout.score !== null) {
      list.add({
        id: `${base}:score`,
        category: 'WORKOUT',
        label: 'Resultado global del entrenamiento',
        value: workout.score,
        occurredAt,
      });
    }
    list.add({
      id: `${base}:personal-records`,
      category: 'WORKOUT',
      label: 'Marcas personales generadas por el entrenamiento',
      value: workout.personalRecords,
      occurredAt,
    });
  });

  return {
    sufficient: snapshot.totals.records > 0 || period.completedWorkouts > 0,
    facts: list.facts,
    dataUsed: [
      { label: 'Periodo analizado', value: `Últimos ${days} días` },
      { label: 'Entrenamientos completados en el periodo', value: period.completedWorkouts },
      { label: 'Entrenamientos recientes incluidos', value: workouts.length },
      { label: 'Series de marcas personales incluidas', value: series.length },
      { label: 'Movimientos con volumen en el periodo', value: volumes.length },
    ],
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Análisis de un entrenamiento                                                                */
/* ------------------------------------------------------------------------------------------ */

export interface AiWorkoutInput {
  name: string;
  description: string | null;
  notes: string | null;
  workoutType: WorkoutType;
  performedOn: string;
  score: WorkoutScore;
  exercises: {
    position: number;
    movementSlug: string;
    movementName: string;
    notes: string | null;
    sets: (NormalizedSet & { setNumber: number })[];
  }[];
  /** Marcas personales que generó este entrenamiento, en unidad canónica. */
  personalRecords: {
    movementSlug: string;
    movementName: string;
    recordType: RecordType;
    repetitions: number | null;
    distanceMeters: number | null;
    value: number;
    /** Mejor marca previa de la serie; `null` si fue la primera. */
    previousBest: number | null;
  }[];
  /** Por movimiento, el último entrenamiento completado anterior que lo incluyó. */
  previousWorkouts: {
    movementSlug: string;
    movementName: string;
    performedOn: string;
    volumeKg: number;
  }[];
}

function describeSet(set: NormalizedSet): string {
  const parts = [
    set.reps === null ? null : `${set.reps} reps`,
    set.loadKg === null ? null : `${set.loadKg} kg`,
    set.distanceMeters === null ? null : `${set.distanceMeters} m`,
    set.durationSeconds === null ? null : `${set.durationSeconds} s`,
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' × ') : 'Sin datos';
}

export function buildWorkoutContext(workout: AiWorkoutInput): AiContextBundle {
  const list = new FactList();
  const occurredAt = workout.performedOn;
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const volumeKg = totalVolumeKg(sets);
  const score = formatScore(workout.workoutType, workout.score);

  list.addText({ id: 'workout:name', category: 'WORKOUT', label: 'Nombre', value: workout.name });
  list.add({ id: 'workout:type', category: 'WORKOUT', label: 'Tipo', value: workout.workoutType });
  list.add({
    id: 'workout:performed-on',
    category: 'WORKOUT',
    label: 'Fecha de realización',
    value: workout.performedOn,
    occurredAt,
  });
  list.addText({
    id: 'workout:description',
    category: 'WORKOUT',
    label: 'Descripción escrita por el atleta',
    value: workout.description,
  });
  list.addText({
    id: 'workout:notes',
    category: 'WORKOUT',
    label: 'Notas escritas por el atleta',
    value: workout.notes,
  });
  if (score !== null) {
    list.add({ id: 'workout:score', category: 'WORKOUT', label: 'Resultado global', value: score });
  }
  if (volumeKg > 0) {
    list.add({
      id: 'workout:volume',
      category: 'WORKOUT',
      label: 'Volumen total',
      value: volumeKg,
      unit: 'kg',
    });
  }

  for (const exercise of workout.exercises) {
    const base = `workout:exercise:${exercise.position}:${exercise.movementSlug}`;
    for (const set of exercise.sets) {
      list.add({
        id: `${base}:set:${set.setNumber}`,
        category: 'WORKOUT',
        label: `${exercise.movementName} — serie ${set.setNumber}`,
        value: describeSet(set),
      });
    }
    const exerciseVolume = totalVolumeKg(exercise.sets);
    if (exerciseVolume > 0) {
      list.add({
        id: `${base}:volume`,
        category: 'VOLUME',
        label: `Volumen de ${exercise.movementName}`,
        value: exerciseVolume,
        unit: 'kg',
      });
    }
    list.addText({
      id: `${base}:notes`,
      category: 'WORKOUT',
      label: `Notas escritas por el atleta — ${exercise.movementName}`,
      value: exercise.notes,
    });
  }

  for (const record of workout.personalRecords) {
    const base = `workout:pr:${record.movementSlug}:${seriesSlug(record)}`;
    const name = seriesLabel(record.movementName, record);
    const unit = CANONICAL_UNIT_SYMBOL[record.recordType];
    list.add({
      id: base,
      category: 'PERSONAL_RECORD',
      label: `Marca personal generada — ${name}`,
      value: record.value,
      unit,
      occurredAt,
    });
    if (record.previousBest !== null) {
      list.add({
        id: `${base}:previous-best`,
        category: 'PERSONAL_RECORD',
        label: `Mejor marca anterior — ${name}`,
        value: record.previousBest,
        unit,
      });
    }
  }

  for (const previous of workout.previousWorkouts) {
    list.add({
      id: `history:${previous.movementSlug}:previous-workout:volume`,
      category: 'HISTORY',
      label: `Volumen de ${previous.movementName} en el entrenamiento anterior que lo incluyó`,
      value: previous.volumeKg,
      unit: 'kg',
      occurredAt: previous.performedOn,
    });
  }

  return {
    sufficient: sets.length > 0 || score !== null,
    facts: list.facts,
    dataUsed: [
      { label: 'Entrenamiento analizado', value: clip(workout.name) },
      { label: 'Ejercicios', value: workout.exercises.length },
      { label: 'Series registradas', value: sets.length },
      { label: 'Marcas personales generadas', value: workout.personalRecords.length },
      {
        label: 'Entrenamientos anteriores usados para comparar',
        value: workout.previousWorkouts.length,
      },
    ],
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Explicación de un WOD                                                                       */
/* ------------------------------------------------------------------------------------------ */

export interface AiWodInput {
  name: string;
  description: string | null;
  workoutType: WorkoutType;
  isBenchmark: boolean;
  durationSeconds: number | null;
  rounds: number | null;
  intervalSeconds: number | null;
  repScheme: number[];
  exercises: {
    position: number;
    movementSlug: string;
    movementName: string;
    /** Etiqueta en español del equipamiento del catálogo. */
    equipment: string;
    reps: number | null;
    loadKg: number | null;
    distanceMeters: number | null;
    durationSeconds: number | null;
    notes: string | null;
  }[];
}

export function buildWodContext(wod: AiWodInput): AiContextBundle {
  const list = new FactList();
  list.addText({ id: 'wod:name', category: 'WOD', label: 'Nombre', value: wod.name });
  list.add({ id: 'wod:type', category: 'WOD', label: 'Tipo', value: wod.workoutType });
  list.add({
    id: 'wod:benchmark',
    category: 'WOD',
    label: 'Es un WOD de referencia (benchmark)',
    value: wod.isBenchmark ? 'Sí' : 'No',
  });
  list.addText({
    id: 'wod:description',
    category: 'WOD',
    label: 'Descripción',
    value: wod.description,
  });
  if (wod.durationSeconds !== null) {
    list.add({
      id: 'wod:duration',
      category: 'WOD',
      label: 'Duración o tiempo límite',
      value: wod.durationSeconds,
      unit: 's',
    });
  }
  if (wod.rounds !== null) {
    list.add({ id: 'wod:rounds', category: 'WOD', label: 'Rondas', value: wod.rounds });
  }
  if (wod.intervalSeconds !== null) {
    list.add({
      id: 'wod:interval',
      category: 'WOD',
      label: 'Intervalo',
      value: wod.intervalSeconds,
      unit: 's',
    });
  }
  if (wod.repScheme.length > 0) {
    list.add({
      id: 'wod:rep-scheme',
      category: 'WOD',
      label: 'Esquema de repeticiones por ronda',
      value: wod.repScheme.join('-'),
    });
    list.add({
      id: 'wod:rep-scheme:total-per-movement',
      category: 'WOD',
      label: 'Repeticiones totales de cada movimiento según el esquema',
      value: wod.repScheme.reduce((total, reps) => total + reps, 0),
      unit: 'reps',
    });
  }

  for (const exercise of wod.exercises) {
    const base = `wod:exercise:${exercise.position}:${exercise.movementSlug}`;
    const name = exercise.movementName;
    list.add({
      id: `${base}:movement`,
      category: 'WOD',
      label: `Movimiento ${exercise.position}`,
      value: name,
    });
    list.add({
      id: `${base}:equipment`,
      category: 'WOD',
      label: `Equipamiento — ${name}`,
      value: exercise.equipment,
    });
    if (exercise.reps !== null) {
      list.add({
        id: `${base}:reps`,
        category: 'WOD',
        label: `Repeticiones — ${name}`,
        value: exercise.reps,
        unit: 'reps',
      });
    }
    if (exercise.loadKg !== null) {
      list.add({
        id: `${base}:load`,
        category: 'WOD',
        label: `Carga prescrita — ${name}`,
        value: exercise.loadKg,
        unit: 'kg',
      });
    }
    if (exercise.distanceMeters !== null) {
      list.add({
        id: `${base}:distance`,
        category: 'WOD',
        label: `Distancia — ${name}`,
        value: exercise.distanceMeters,
        unit: 'm',
      });
    }
    if (exercise.durationSeconds !== null) {
      list.add({
        id: `${base}:duration`,
        category: 'WOD',
        label: `Duración — ${name}`,
        value: exercise.durationSeconds,
        unit: 's',
      });
    }
    list.addText({
      id: `${base}:notes`,
      category: 'WOD',
      label: `Notas — ${name}`,
      value: exercise.notes,
    });
  }

  return {
    sufficient: wod.exercises.length > 0,
    facts: list.facts,
    dataUsed: [
      { label: 'WOD', value: clip(wod.name) },
      { label: 'Movimientos', value: wod.exercises.length },
      {
        label: 'Esquema de repeticiones',
        value: wod.repScheme.length ? wod.repScheme.join('-') : 'No definido',
      },
    ],
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Explicación de un movimiento                                                                */
/* ------------------------------------------------------------------------------------------ */

/** Datos del catálogo, con etiquetas ya traducidas por la API. El catálogo es la fuente primaria. */
export interface AiMovementInput {
  name: string;
  description: string | null;
  category: string;
  equipment: string;
  difficulty: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  recordTypes: string[];
}

export function buildMovementContext(movement: AiMovementInput): AiContextBundle {
  const list = new FactList();
  const instructions = movement.instructions.slice(0, AI_CONTEXT_LIMITS.instructions);
  list.add({ id: 'movement:name', category: 'MOVEMENT', label: 'Nombre', value: movement.name });
  list.addText({
    id: 'movement:description',
    category: 'MOVEMENT',
    label: 'Descripción del catálogo',
    value: movement.description,
  });
  list.add({
    id: 'movement:category',
    category: 'MOVEMENT',
    label: 'Región corporal',
    value: movement.category,
  });
  list.add({
    id: 'movement:equipment',
    category: 'MOVEMENT',
    label: 'Equipamiento',
    value: movement.equipment,
  });
  if (movement.difficulty !== null) {
    list.add({
      id: 'movement:difficulty',
      category: 'MOVEMENT',
      label: 'Dificultad',
      value: movement.difficulty,
    });
  }
  if (movement.primaryMuscles.length) {
    list.add({
      id: 'movement:primary-muscles',
      category: 'MOVEMENT',
      label: 'Músculos principales registrados',
      value: movement.primaryMuscles.join(', '),
    });
  }
  if (movement.secondaryMuscles.length) {
    list.add({
      id: 'movement:secondary-muscles',
      category: 'MOVEMENT',
      label: 'Músculos secundarios registrados',
      value: movement.secondaryMuscles.join(', '),
    });
  }
  instructions.forEach((instruction, index) => {
    list.addText({
      id: `movement:instruction:${index + 1}`,
      category: 'MOVEMENT',
      label: `Instrucción ${index + 1} del catálogo`,
      value: instruction,
    });
  });
  if (movement.recordTypes.length) {
    list.add({
      id: 'movement:record-types',
      category: 'MOVEMENT',
      label: 'Tipos de marca que admite',
      value: movement.recordTypes.join(', '),
    });
  }

  return {
    sufficient:
      movement.description !== null ||
      instructions.length > 0 ||
      movement.primaryMuscles.length > 0,
    facts: list.facts,
    dataUsed: [
      { label: 'Movimiento', value: movement.name },
      { label: 'Instrucciones del catálogo', value: instructions.length },
      {
        label: 'Músculos registrados',
        value: movement.primaryMuscles.length + movement.secondaryMuscles.length,
      },
    ],
  };
}
