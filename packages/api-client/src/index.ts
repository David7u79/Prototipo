/**
 * Cliente HTTP tipado de la API de GarFit.
 *
 * Sin dependencias: usa `fetch` nativo, así funciona igual en Next.js
 * (servidor y navegador), Expo y Astro. No guarda tokens: quien lo usa
 * decide dónde viven (cookies httpOnly en web, SecureStore en mobile).
 *
 * @packageDocumentation
 */
import type {
  AiAnalysisResponse,
  AiConsentResponse,
  AiStatusResponse,
  ApiErrorBody,
  AthleteProfile,
  AuthProvidersResponse,
  AuthResponse,
  HealthResponse,
  LatestReleaseResponse,
  MovementDetail,
  MovementFilters,
  MovementRecordsResponse,
  MovementSummary,
  Paginated,
  PersonalRecord,
  RecordsOverviewResponse,
  RecordsSummaryResponse,
  User,
  WodDetail,
  WodFilters,
  WodSummary,
  WorkoutDetail,
  WorkoutFilters,
  WorkoutListItem,
  WorkoutStatsResponse,
} from '@garfit/types';
import type {
  AthleteProfileInput,
  CompleteWorkoutInput,
  CreateRecordInput,
  CreateWodInput,
  CreateWorkoutInput,
  LoginInput,
  RegisterInput,
  UpdateRecordInput,
  UpdateWorkoutInput,
  WorkoutResultsInput,
} from '@garfit/validation';

/** Construye `?a=1&b=2` omitiendo valores vacíos. */
export function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Error de la API con el cuerpo normalizado. `status` 0 indica fallo de red. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }

  /** Código estable (ver `API_ERROR_CODES` en `@garfit/types`). */
  get code(): string {
    return this.body.code;
  }
}

export interface ApiClientOptions {
  /** URL base de la API, p. ej. `http://localhost:4000`. Sin barra final. */
  baseUrl: string;
  /** Devuelve el access token vigente, o `null` si no hay sesión. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** `fetch` alternativo (tests, Next.js con opciones de caché). */
  fetch?: typeof fetch;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Crea un cliente ligado a una URL base y a una fuente de access token. */
export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const doFetch = options.fetch ?? fetch;

  async function request<T>(
    method: Method,
    path: string,
    body?: unknown,
    auth = false,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = await options.getAccessToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Network error';
      throw new ApiError(0, { statusCode: 0, code: 'NETWORK_ERROR', message });
    }

    if (res.status === 204) return undefined as T;
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, toErrorBody(res.status, data));
    return data as T;
  }

  return {
    health: () => request<HealthResponse>('GET', '/health'),

    auth: {
      providers: () => request<AuthProvidersResponse>('GET', '/auth/providers'),
      register: (input: RegisterInput) => request<AuthResponse>('POST', '/auth/register', input),
      login: (input: LoginInput) => request<AuthResponse>('POST', '/auth/login', input),
      /** Intercambia un ID token de Google por credenciales de GarFit. */
      google: (idToken: string) => request<AuthResponse>('POST', '/auth/google', { idToken }),
      refresh: (refreshToken: string) =>
        request<AuthResponse>('POST', '/auth/refresh', { refreshToken }),
      logout: (refreshToken: string) => request<void>('POST', '/auth/logout', { refreshToken }),
      me: () => request<User>('GET', '/auth/me', undefined, true),
    },

    profile: {
      /** Lanza `ApiError` 404 con código `PROFILE_NOT_FOUND` si aún no existe. */
      get: () => request<AthleteProfile>('GET', '/profile', undefined, true),
      upsert: (input: AthleteProfileInput) =>
        request<AthleteProfile>('PUT', '/profile', input, true),
    },

    movements: {
      list: (filters: MovementFilters = {}) =>
        request<Paginated<MovementSummary>>(
          'GET',
          `/movements${toQueryString(filters)}`,
          undefined,
          true,
        ),
      /** Lanza `ApiError` 404 `MOVEMENT_NOT_FOUND` si el slug no existe. */
      get: (slug: string) =>
        request<MovementDetail>('GET', `/movements/${encodeURIComponent(slug)}`, undefined, true),
    },

    records: {
      /** Mejor marca y marca actual por serie, ordenadas por actividad reciente. */
      overview: () => request<RecordsOverviewResponse>('GET', '/records', undefined, true),
      summary: () => request<RecordsSummaryResponse>('GET', '/records/summary', undefined, true),
      /** Historial completo en un movimiento; `series` vacío si aún no hay marcas. */
      forMovement: (movementSlug: string) =>
        request<MovementRecordsResponse>(
          'GET',
          `/records/${encodeURIComponent(movementSlug)}`,
          undefined,
          true,
        ),
      create: (input: CreateRecordInput) =>
        request<PersonalRecord>('POST', '/records', input, true),
      update: (id: string, input: UpdateRecordInput) =>
        request<PersonalRecord>('PATCH', `/records/${encodeURIComponent(id)}`, input, true),
      /** Borrado lógico: deja de contar en cálculos e historial. */
      remove: (id: string) =>
        request<void>('DELETE', `/records/${encodeURIComponent(id)}`, undefined, true),
    },

    wods: {
      /** Catálogo público (benchmarks) más los WODs personales del atleta. */
      list: (filters: WodFilters = {}) =>
        request<Paginated<WodSummary>>('GET', `/wods${toQueryString(filters)}`, undefined, true),
      /** Lanza `ApiError` 404 `WOD_NOT_FOUND` si no existe o es privado de otro atleta. */
      get: (slug: string) =>
        request<WodDetail>('GET', `/wods/${encodeURIComponent(slug)}`, undefined, true),
      /** Crea un WOD personal y privado. */
      create: (input: CreateWodInput) => request<WodDetail>('POST', '/wods', input, true),
    },

    workouts: {
      /** Historial paginado, del más reciente al más antiguo. */
      list: (filters: WorkoutFilters = {}) =>
        request<Paginated<WorkoutListItem>>(
          'GET',
          `/workouts${toQueryString(filters)}`,
          undefined,
          true,
        ),
      stats: () => request<WorkoutStatsResponse>('GET', '/workouts/stats', undefined, true),
      get: (id: string) => request<WorkoutDetail>('GET', workoutPath(id), undefined, true),
      /** Libre (`name`, `workoutType`, `exercises`) o desde un WOD (`wodSlug`). */
      create: (input: CreateWorkoutInput) =>
        request<WorkoutDetail>('POST', '/workouts', input, true),
      /** Sólo en DRAFT; si se envía `exercises`, reemplaza la lista. */
      update: (id: string, input: UpdateWorkoutInput) =>
        request<WorkoutDetail>('PATCH', workoutPath(id), input, true),
      /** Borrado lógico; retira también las marcas que derivó. */
      remove: (id: string) => request<void>('DELETE', workoutPath(id), undefined, true),
      /** DRAFT → IN_PROGRESS: fija la estructura y registra `startedAt`. */
      start: (id: string) =>
        request<WorkoutDetail>('POST', `${workoutPath(id)}/start`, undefined, true),
      /** Reemplaza todos los resultados y el score (antes de completar). */
      saveResults: (id: string, input: WorkoutResultsInput) =>
        request<WorkoutDetail>('PUT', `${workoutPath(id)}/results`, input, true),
      /**
       * Completa el entrenamiento y deriva marcas personales. Idempotente: repetirlo devuelve el
       * mismo resultado sin duplicar marcas.
       */
      complete: (id: string, input: CompleteWorkoutInput = {}) =>
        request<WorkoutDetail>('POST', `${workoutPath(id)}/complete`, input, true),
    },

    /**
     * Análisis explicativos. GarFit calcula los datos y el proveedor sólo los interpreta: cada
     * observación cita evidencia que la API resuelve. Requieren consentimiento del atleta
     * (`403 AI_CONSENT_REQUIRED` si falta).
     */
    ai: {
      /** Estado del servicio; nunca incluye credenciales. */
      status: () => request<AiStatusResponse>('GET', '/ai/status', undefined, true),
      /** Acepta enviar datos deportivos al proveedor de IA. Idempotente. */
      giveConsent: () => request<AiConsentResponse>('POST', '/ai/consent', undefined, true),
      revokeConsent: () => request<AiConsentResponse>('DELETE', '/ai/consent', undefined, true),
      /** Analiza el progreso del periodo indicado (30 días por defecto). */
      analyzeProgress: (input: { periodDays?: 30 | 60 | 90 } = {}) =>
        request<AiAnalysisResponse>('POST', '/ai/analyze/progress', input, true),
      /** Analiza un entrenamiento completado del propio atleta. */
      analyzeWorkout: (workoutId: string) =>
        request<AiAnalysisResponse>(
          'POST',
          `/ai/analyze/workout/${encodeURIComponent(workoutId)}`,
          undefined,
          true,
        ),
      explainWod: (slug: string) =>
        request<AiAnalysisResponse>(
          'POST',
          `/ai/explain/wod/${encodeURIComponent(slug)}`,
          undefined,
          true,
        ),
      explainMovement: (slug: string) =>
        request<AiAnalysisResponse>(
          'POST',
          `/ai/explain/movement/${encodeURIComponent(slug)}`,
          undefined,
          true,
        ),
    },

    releases: {
      /** Devuelve `null` si no hay ninguna versión Android publicada. */
      latestAndroid: async (): Promise<LatestReleaseResponse | null> => {
        try {
          return await request<LatestReleaseResponse>('GET', '/releases/latest/android');
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

function workoutPath(id: string): string {
  return `/workouts/${encodeURIComponent(id)}`;
}

function toErrorBody(status: number, data: unknown): ApiErrorBody {
  if (data && typeof data === 'object' && 'message' in data) {
    const d = data as Partial<ApiErrorBody> & { message: unknown };
    return {
      statusCode: status,
      code: typeof d.code === 'string' ? d.code : `HTTP_${status}`,
      message: Array.isArray(d.message) ? d.message.join(', ') : String(d.message),
      ...(Array.isArray(d.details) ? { details: d.details } : {}),
    };
  }
  return { statusCode: status, code: `HTTP_${status}`, message: `HTTP ${status}` };
}
