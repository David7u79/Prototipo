/**
 * Contratos de la API de GarFit compartidos por web, mobile y landing.
 *
 * Son la fuente de verdad del lado cliente; la API NestJS los respeta y
 * su especificación OpenAPI (`docs/generated/openapi`) es la referencia
 * ejecutable. Todas las fechas viajan como cadenas ISO-8601.
 *
 * @packageDocumentation
 */

/** Proveedores de identidad soportados. */
export type AuthProvider = 'LOCAL' | 'GOOGLE';

/** Nivel de experiencia declarado por el atleta. */
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** Objetivo principal declarado por el atleta. */
export type PrimaryGoal = 'STRENGTH' | 'ENDURANCE' | 'HYPERTROPHY' | 'WEIGHT_LOSS' | 'GENERAL_FITNESS';

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
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
