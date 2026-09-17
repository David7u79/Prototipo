/**
 * Reglas de negocio compartidas: única fuente de verdad para límites, enums e identificadores.
 * La API (class-validator), los esquemas zod de los clientes y el schema de Prisma deben
 * coincidir con estos valores; los tests de la API comprueban que los enums de Prisma son
 * idénticos a los de aquí.
 */

// --- Identidad y perfil ------------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 80;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const PRIMARY_GOALS = [
  'STRENGTH',
  'ENDURANCE',
  'HYPERTROPHY',
  'WEIGHT_LOSS',
  'GENERAL_FITNESS',
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

/** Sistema de unidades con el que el atleta prefiere ver pesos y distancias. */
export const UNIT_SYSTEMS = ['METRIC', 'IMPERIAL'] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

/** Límites de los datos opcionales del perfil deportivo (no son datos médicos). */
export const PROFILE_LIMITS = {
  heightCm: { min: 50, max: 272 },
  weightKg: { min: 20, max: 400 },
  /** Edad mínima y máxima admitidas a partir de la fecha de nacimiento. */
  ageYears: { min: 5, max: 120 },
} as const;

// --- Marcas personales -------------------------------------------------------------------

/**
 * Qué se mide en una marca:
 * - WEIGHT: carga levantada (mayor es mejor), opcionalmente para N repeticiones (1RM, 5RM…).
 * - REPS: repeticiones máximas (mayor es mejor).
 * - DISTANCE: distancia recorrida (mayor es mejor).
 * - DURATION: tiempo sostenido, p. ej. una plancha (mayor es mejor).
 * - TIME: tiempo para completar el esfuerzo (menor es mejor).
 */
export const RECORD_TYPES = ['WEIGHT', 'REPS', 'DISTANCE', 'DURATION', 'TIME'] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

/** Origen de la marca. WORKOUT se usará cuando los resultados de entrenamiento generen PRs. */
export const RECORD_SOURCES = ['MANUAL', 'WORKOUT'] as const;
export type RecordSource = (typeof RECORD_SOURCES)[number];

export const RECORD_UNITS = [
  'KILOGRAM',
  'POUND',
  'REPETITION',
  'METER',
  'KILOMETER',
  'MILE',
  'SECOND',
] as const;
export type RecordUnit = (typeof RECORD_UNITS)[number];

/** Unidades aceptadas para cada tipo de marca. La primera es la canónica. */
export const UNITS_BY_RECORD_TYPE: Record<RecordType, readonly RecordUnit[]> = {
  WEIGHT: ['KILOGRAM', 'POUND'],
  REPS: ['REPETITION'],
  DISTANCE: ['METER', 'KILOMETER', 'MILE'],
  DURATION: ['SECOND'],
  TIME: ['SECOND'],
};

/** Límites en unidad canónica (kg, repeticiones, metros, segundos). */
export const RECORD_LIMITS: Record<RecordType, { min: number; max: number }> = {
  WEIGHT: { min: 0.1, max: 1000 },
  REPS: { min: 1, max: 10_000 },
  DISTANCE: { min: 1, max: 1_000_000 },
  DURATION: { min: 1, max: 86_400 },
  TIME: { min: 1, max: 86_400 },
};

/** Repeticiones de una marca de carga (1 = 1RM). */
export const RECORD_REPETITIONS_LIMITS = { min: 1, max: 100 } as const;
export const RECORD_NOTES_MAX_LENGTH = 500;
/** Decimales admitidos en el valor introducido. */
export const RECORD_VALUE_MAX_DECIMALS = 3;
/** Fecha mínima aceptada para una marca (YYYY-MM-DD). */
export const RECORD_MIN_DATE = '1900-01-01';

// --- Catálogo y listados -----------------------------------------------------------------

/** Slug estable: minúsculas, dígitos y guiones, sin guiones al inicio ni al final. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 120;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SEARCH_MAX_LENGTH = 80;
export const PAGINATION = { defaultLimit: 20, maxLimit: 50, maxPage: 10_000 } as const;

/** Fecha de calendario `YYYY-MM-DD` (sin hora). */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
