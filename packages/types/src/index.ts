/**
 * Contratos de la API de GarFit compartidos por web, mobile y landing.
 *
 * Son la fuente de verdad del lado cliente; la API NestJS los respeta y
 * su especificación OpenAPI (`docs/generated/openapi`) es la referencia
 * ejecutable. Todas las fechas viajan como cadenas ISO-8601.
 *
 * @packageDocumentation
 */

import type {
  AthleteProgressSnapshot,
  Change,
  ExperienceLevel,
  PrimaryGoal,
  RecordSource,
  RecordType,
  RecordUnit,
  UnitSystem,
} from '@garfit/domain';
import type {
  Equipment,
  MovementCategory,
  MovementDifficulty,
  MuscleGroup,
} from '@garfit/movements';

export type {
  AthleteProgressSnapshot,
  Change,
  Equipment,
  ExperienceLevel,
  MovementCategory,
  MovementDifficulty,
  MuscleGroup,
  PrimaryGoal,
  RecordSource,
  RecordType,
  RecordUnit,
  UnitSystem,
};

/** Proveedores de identidad soportados. */
export type AuthProvider = 'LOCAL' | 'GOOGLE';

/** Usuario autenticado tal como lo expone la API. Nunca incluye credenciales. */
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  /** Proveedores vinculados a esta cuenta. */
  providers: AuthProvider[];
  createdAt: string;
  updatedAt: string;
}

/** Perfil deportivo del atleta (1:1 con {@link User}). */
export interface AthleteProfile {
  id: string;
  userId: string;
  displayName: string;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  preferredUnits: UnitSystem;
  /** `YYYY-MM-DD` o `null`. */
  birthDate: string | null;
  heightCm: number | null;
  /** Siempre en kg; convertir para mostrar según `preferredUnits`. */
  weightKg: number | null;
  /** `YYYY-MM-DD` o `null`. */
  trainingSince: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Credenciales emitidas por GarFit tras autenticarse (local o Google).
 * `accessToken` es un JWT de vida corta; `refreshToken` es opaco y rotativo.
 */
export interface AuthTokens {
  accessToken: string;
  /** Segundos hasta que expira `accessToken`. */
  accessTokenExpiresIn: number;
  refreshToken: string;
  /** Fecha ISO en que expira `refreshToken`. */
  refreshTokenExpiresAt: string;
}

/** Respuesta de `POST /auth/register`, `/auth/login`, `/auth/google` y `/auth/refresh`. */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/** Respuesta de `GET /auth/providers`: qué métodos de acceso están activos. */
export interface AuthProvidersResponse {
  local: true;
  google: {
    enabled: boolean;
    /** Client ID OAuth web (público). `null` si Google no está configurado. */
    webClientId: string | null;
  };
}

/** Respuesta de `GET /health`. */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  version: string;
  timestamp: string;
}

/** Plataformas de distribución soportadas por el módulo de releases. */
export type ReleasePlatform = 'android';

/** Respuesta de `GET /releases/latest/android` cuando existe una versión publicada. */
export interface LatestReleaseResponse {
  platform: ReleasePlatform;
  version: string;
  versionCode: number;
  releasedAt: string;
  /** Tamaño del APK en bytes. */
  size: number;
  downloadUrl: string;
  sha256: string;
  changelog: string[];
}

/** Forma común de los errores HTTP de la API. */
export interface ApiErrorBody {
  statusCode: number;
  /** Código estable legible por máquina, p. ej. `NO_RELEASE_PUBLISHED`. */
  code: string;
  message: string;
  /** Detalle de validación campo a campo, cuando aplica. */
  details?: string[];
}

/** Códigos de error estables que los clientes pueden interpretar. */
export const API_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  GOOGLE_AUTH_NOT_CONFIGURED: 'GOOGLE_AUTH_NOT_CONFIGURED',
  INVALID_GOOGLE_TOKEN: 'INVALID_GOOGLE_TOKEN',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  NO_RELEASE_PUBLISHED: 'NO_RELEASE_PUBLISHED',
  RELEASE_NOT_FOUND: 'RELEASE_NOT_FOUND',
  MOVEMENT_NOT_FOUND: 'MOVEMENT_NOT_FOUND',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  /** El movimiento no admite ese tipo de marca (ver `Movement.recordTypes`). */
  RECORD_TYPE_NOT_ALLOWED: 'RECORD_TYPE_NOT_ALLOWED',
  /** La unidad no corresponde al tipo de marca, o el valor queda fuera de límites. */
  INVALID_RECORD_VALUE: 'INVALID_RECORD_VALUE',
  NOT_FOUND: 'NOT_FOUND',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// --- Listados ------------------------------------------------------------------------------

/** Respuesta paginada. `page` empieza en 1; `totalPages` es 0 si no hay resultados. */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- Movimientos ---------------------------------------------------------------------------

/** Movimiento en listados (`GET /movements`). */
export interface MovementSummary {
  id: string;
  slug: string;
  name: string;
  category: MovementCategory;
  equipment: Equipment;
  /** `null` cuando la fuente no clasifica la dificultad. */
  difficulty: MovementDifficulty | null;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  /** Tipos de marca que admite; el primero es el sugerido por defecto. */
  recordTypes: RecordType[];
}

/** Detalle de un movimiento (`GET /movements/:slug`). */
export interface MovementDetail extends MovementSummary {
  description: string | null;
  /** Pasos de ejecución en español. */
  instructions: string[];
  /** Procedencia del dato, p. ej. `hasaneyldrm/exercises-dataset`. */
  source: string | null;
}

/** Filtros de `GET /movements`. Todos opcionales; se combinan con AND. */
export interface MovementFilters {
  /** Texto contenido en el nombre (sin distinguir mayúsculas). */
  search?: string;
  category?: MovementCategory;
  equipment?: Equipment;
  /** Coincide con músculos principales o secundarios. */
  muscleGroup?: MuscleGroup;
  difficulty?: MovementDifficulty;
  recordType?: RecordType;
  page?: number;
  limit?: number;
}

// --- Marcas personales ---------------------------------------------------------------------

/** Referencia mínima a un movimiento dentro de una marca. */
export interface MovementRef {
  slug: string;
  name: string;
  category: MovementCategory;
  equipment: Equipment;
}

/** Un registro de marca personal (`POST /records`, `PATCH /records/:id`). */
export interface PersonalRecord {
  id: string;
  movement: MovementRef;
  recordType: RecordType;
  /** Valor tal como se introdujo, en `unit`. */
  value: number;
  unit: RecordUnit;
  /** Valor en unidad canónica (kg, repeticiones, metros o segundos). */
  normalizedValue: number;
  /** Repeticiones de la marca de carga (1 = 1RM); `null` en otros tipos. */
  repetitions: number | null;
  /** `YYYY-MM-DD`. */
  performedAt: string;
  notes: string | null;
  source: RecordSource;
  createdAt: string;
  updatedAt: string;
}

/** Registro dentro del historial de una serie. */
export interface RecordHistoryEntry extends Omit<PersonalRecord, 'movement'> {
  /** `true` si al registrarse superó todas las marcas anteriores de su serie. */
  isPersonalBest: boolean;
}

/**
 * Serie de marcas comparables (mismo tipo y, en cargas, mismas repeticiones), con cálculos de
 * `@garfit/domain`. Todos los cambios están en unidad canónica.
 */
export interface RecordSeries {
  key: string;
  recordType: RecordType;
  repetitions: number | null;
  lowerIsBetter: boolean;
  count: number;
  first: RecordHistoryEntry;
  current: RecordHistoryEntry;
  best: RecordHistoryEntry;
  changeFromPrevious: Change | null;
  bestImprovement: Change | null;
  totalProgress: Change | null;
}

/** `GET /records/:movementSlug`: historial completo del atleta en un movimiento. */
export interface MovementRecordsResponse {
  movement: MovementSummary;
  series: (RecordSeries & { history: RecordHistoryEntry[] })[];
}

/** `GET /records`: una fila por serie con marca, ordenadas por la actividad más reciente. */
export interface RecordsOverviewResponse {
  items: { movement: MovementRef; series: RecordSeries }[];
}

/** `GET /records/summary`: datos para el dashboard. */
export interface RecordsSummaryResponse {
  movementsWithRecords: number;
  totalRecords: number;
  latestRecord: PersonalRecord | null;
  /** Mejora más reciente de una mejor marca respecto a la anterior; `null` si no hubo ninguna. */
  recentImprovement: { record: PersonalRecord; improvement: Change } | null;
  /** Últimos registros (máximo 5), del más reciente al más antiguo. */
  recentRecords: PersonalRecord[];
}
