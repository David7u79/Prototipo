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
  AiAnalysisType,
  AiDataUsed,
  AiEvidenceFact,
  AthleteProgressSnapshot,
  Change,
  DistanceUnit,
  ExperienceLevel,
  LoadUnit,
  PrimaryGoal,
  RecordSource,
  RecordType,
  RecordUnit,
  UnitSystem,
  WorkoutScore,
  WorkoutStatus,
  WorkoutType,
} from '@garfit/domain';
import type {
  Equipment,
  MovementCategory,
  MovementDifficulty,
  MuscleGroup,
} from '@garfit/movements';

export type {
  AiAnalysisType,
  AiDataUsed,
  AiEvidenceFact,
  AthleteProgressSnapshot,
  Change,
  DistanceUnit,
  LoadUnit,
  WorkoutScore,
  WorkoutStatus,
  WorkoutType,
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
  /** La marca deriva de un entrenamiento: se gestiona desde el entrenamiento, no a mano. */
  RECORD_MANAGED_BY_WORKOUT: 'RECORD_MANAGED_BY_WORKOUT',
  WORKOUT_NOT_FOUND: 'WORKOUT_NOT_FOUND',
  /** La operación no está permitida en el estado actual (p. ej. editar uno completado). */
  WORKOUT_INVALID_STATE: 'WORKOUT_INVALID_STATE',
  /** Faltan resultados o score exigidos por el tipo de entrenamiento para completarlo. */
  WORKOUT_INCOMPLETE: 'WORKOUT_INCOMPLETE',
  WOD_NOT_FOUND: 'WOD_NOT_FOUND',
  /** La unidad no corresponde al tipo de marca, o el valor queda fuera de límites. */
  INVALID_RECORD_VALUE: 'INVALID_RECORD_VALUE',
  /** El servicio de IA está desactivado por configuración (`GEMINI_ENABLED=false`). */
  AI_DISABLED: 'AI_DISABLED',
  /** Falta la credencial del proveedor de IA. */
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  /** El atleta no ha aceptado enviar datos deportivos al proveedor de IA. */
  AI_CONSENT_REQUIRED: 'AI_CONSENT_REQUIRED',
  /** El proveedor no respondió a tiempo o falló de forma transitoria. */
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  /** Límite de uso alcanzado (del proveedor o de GarFit). */
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  /** El proveedor devolvió una respuesta que no cumple el esquema o cita evidencia inexistente. */
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  /** Error no recuperable al generar el análisis. */
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
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
  /** Calificador de distancia de TIME (la distancia cronometrada); `null` en otros tipos. */
  distanceValue: number | null;
  distanceUnit: DistanceUnit | null;
  distanceMeters: number | null;
  /** `YYYY-MM-DD`. */
  performedAt: string;
  notes: string | null;
  source: RecordSource;
  /** Por qué existe la marca si se derivó de un entrenamiento; `null` si es MANUAL. */
  origin: RecordOrigin | null;
  createdAt: string;
  updatedAt: string;
}

/** Resultado de entrenamiento que originó una marca (`source = WORKOUT`). */
export interface RecordOrigin {
  workoutId: string;
  workoutName: string;
  /** `YYYY-MM-DD`. */
  performedOn: string;
  setNumber: number;
  reps: number | null;
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
  /** Distancia que califica la serie de TIME (p. ej. 5000); `null` en otros tipos. */
  distanceMeters: number | null;
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

// --- WODs ----------------------------------------------------------------------------------

/** Parámetros globales de un WOD o entrenamiento. */
export interface WorkoutPrescriptionFields {
  workoutType: WorkoutType;
  /** AMRAP/EMOM: duración total; FOR_TIME: tiempo límite opcional. */
  durationSeconds: number | null;
  rounds: number | null;
  /** EMOM: segundos de cada intervalo. */
  intervalSeconds: number | null;
  /** Repeticiones por ronda, p. ej. [21, 15, 9]; [] si no aplica. */
  repScheme: number[];
}

/** Movimiento prescrito en un WOD. */
export interface WodExercise {
  position: number;
  movement: MovementRef & { recordTypes: RecordType[] };
  reps: number | null;
  loadValue: number | null;
  loadUnit: LoadUnit | null;
  distanceValue: number | null;
  distanceUnit: DistanceUnit | null;
  durationSeconds: number | null;
  notes: string | null;
}

/** WOD en listados (`GET /wods`). */
export interface WodSummary extends WorkoutPrescriptionFields {
  id: string;
  slug: string;
  name: string;
  isBenchmark: boolean;
  /** `true` si es un WOD privado del atleta autenticado. */
  isPersonal: boolean;
  exerciseCount: number;
}

/** Detalle de un WOD (`GET /wods/:slug`). */
export interface WodDetail extends WodSummary {
  description: string | null;
  source: string | null;
  exercises: WodExercise[];
}

export interface WodFilters {
  search?: string;
  workoutType?: WorkoutType;
  benchmark?: boolean;
  page?: number;
  limit?: number;
}

// --- Entrenamientos ------------------------------------------------------------------------

/** Serie realizada de un ejercicio. */
export interface WorkoutSetResult {
  id: string;
  setNumber: number;
  reps: number | null;
  loadValue: number | null;
  loadUnit: LoadUnit | null;
  loadKg: number | null;
  distanceValue: number | null;
  distanceUnit: DistanceUnit | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
}

/** Ejercicio de un entrenamiento, con su prescripción y resultados. */
export interface WorkoutExercise {
  id: string;
  position: number;
  movement: MovementRef & { recordTypes: RecordType[] };
  targetSets: number | null;
  targetReps: number | null;
  targetLoadValue: number | null;
  targetLoadUnit: LoadUnit | null;
  targetDistanceValue: number | null;
  targetDistanceUnit: DistanceUnit | null;
  targetDurationSeconds: number | null;
  restSeconds: number | null;
  notes: string | null;
  results: WorkoutSetResult[];
  /** Volumen del ejercicio en kg (Σ reps × carga). */
  volumeKg: number;
}

/** Marca personal derivada de un entrenamiento, con la mejor marca previa de su serie. */
export interface DerivedPersonalRecord {
  record: PersonalRecord;
  /** Mejor marca anterior de la serie en unidad canónica; `null` si fue la primera. */
  previousBest: number | null;
  /** Cambio respecto a `previousBest`; `null` si fue la primera. */
  change: Change | null;
}

/** Entrenamiento en listados e historial (`GET /workouts`). */
export interface WorkoutListItem {
  id: string;
  name: string;
  workoutType: WorkoutType;
  status: WorkoutStatus;
  /** `YYYY-MM-DD` al completarse; `null` si aún no se completó. */
  performedOn: string | null;
  completedAt: string | null;
  createdAt: string;
  wod: { slug: string; name: string } | null;
  /** Nombres de los movimientos en orden. */
  movements: string[];
  /** Resultado principal ya formateado (score global o resumen de series); `null` si no hay. */
  headline: string | null;
  personalRecordCount: number;
}

/** Detalle de un entrenamiento (`GET /workouts/:id` y respuesta de `complete`). */
export interface WorkoutDetail extends WorkoutPrescriptionFields {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  status: WorkoutStatus;
  performedOn: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  wod: { slug: string; name: string } | null;
  exercises: WorkoutExercise[];
  /** Score global; `null` si no se registró o el tipo se mide por series. */
  score: WorkoutScore | null;
  headline: string | null;
  volumeKg: number;
  personalRecords: DerivedPersonalRecord[];
}

export interface WorkoutFilters {
  /** `YYYY-MM-DD` inclusive, sobre la fecha de realización. */
  from?: string;
  to?: string;
  /** Slug de movimiento contenido en el entrenamiento. */
  movement?: string;
  workoutType?: WorkoutType;
  status?: WorkoutStatus;
  page?: number;
  limit?: number;
}

/** `GET /workouts/stats`: estadísticas básicas para dashboard. */
export interface WorkoutStatsResponse {
  totalCompleted: number;
  last7Days: number;
  last30Days: number;
  lastWorkout: WorkoutListItem | null;
  personalRecordsFromWorkoutsLast30Days: number;
  /** Últimas marcas derivadas de entrenamientos (máximo 5). */
  recentPersonalRecords: PersonalRecord[];
  volumeByMovementLast30Days: { movement: MovementRef; volumeKg: number }[];
}

/* ---------------------------------------------------------------------------------------- */
/* IA explicativa (fase 4)                                                                   */
/* ---------------------------------------------------------------------------------------- */

export type AiProviderName = 'GEMINI' | 'FAKE';

/** `GET /ai/status`. Nunca incluye credenciales. */
export interface AiStatusResponse {
  /** `GEMINI_ENABLED`: el servicio está activado por configuración. */
  enabled: boolean;
  /** Hay credenciales para el proveedor (o se usa el proveedor simulado fuera de producción). */
  configured: boolean;
  provider: AiProviderName;
  model: string;
  /** Fecha en que el atleta aceptó enviar datos deportivos al proveedor; `null` sin consentimiento. */
  consentGivenAt: string | null;
}

/** `POST /ai/consent` y `DELETE /ai/consent`. */
export interface AiConsentResponse {
  consentGivenAt: string | null;
}

/** Observación o sugerencia con su evidencia resuelta por GarFit (no por el modelo). */
export interface AiAnalysisItem {
  title: string;
  description: string;
  evidence: AiEvidenceFact[];
}

/** Respuesta de los cuatro endpoints de análisis y explicación. */
export interface AiAnalysisResponse {
  /** `null` si no se llamó al proveedor (datos insuficientes detectados por GarFit). */
  id: string | null;
  type: AiAnalysisType;
  status: 'COMPLETED' | 'INSUFFICIENT_DATA';
  /** `true` si se devolvió un análisis guardado con los mismos datos, modelo y versión de prompt. */
  cached: boolean;
  provider: AiProviderName | null;
  model: string | null;
  promptVersion: string | null;
  /** Fecha en que se generó (en caché: la fecha original, no la de la consulta). */
  generatedAt: string;
  /** Sólo en análisis de progreso. */
  periodDays: number | null;
  summary: string;
  observations: AiAnalysisItem[];
  suggestions: AiAnalysisItem[];
  limitations: string[];
  missingData: string[];
  /** Qué datos se usaron, para mostrarlo al atleta. */
  dataUsed: AiDataUsed[];
}
