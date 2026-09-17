/**
 * Configuración validada de la API. Se valida una sola vez al arrancar: si falta un
 * secreto o un número no es válido, la API no acepta tráfico.
 */
export interface Env {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  PUBLIC_API_URL: string;
  CORS_ORIGINS: string[];
  SWAGGER_ENABLED: boolean;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  /** Vacío = login con Google desactivado. */
  GOOGLE_WEB_CLIENT_ID: string | null;
  /** Audiencias adicionales aceptadas en el ID token (p. ej. clientes Android/iOS). */
  GOOGLE_EXTRA_AUDIENCES: string[];
  /** Vacío = `storage/releases` en la raíz del repositorio. */
  RELEASES_STORAGE_DIR: string | null;
  GEMINI_API_KEY: string | null;
  GEMINI_MODEL: string;
  GEMINI_ENABLED: boolean;
  AI_PROVIDER: 'gemini' | 'fake';
  AI_TIMEOUT_MS: number;
  AI_RATE_LIMIT_PER_MINUTE: number;
  AI_RATE_LIMIT_PER_DAY: number;
}

const MIN_SECRET_LENGTH = 32;

export function validateEnvironment(raw: Record<string, unknown>): Env {
  const text = (name: string): string | null => {
    const value = raw[name];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  };
  const required = (name: string): string => {
    const value = text(name);
    if (!value) throw new Error(`${name} es obligatorio`);
    return value;
  };
  const positiveInt = (name: string, fallback: number): number => {
    const value = text(name);
    if (value === null) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${name} debe ser un entero positivo`);
    }
    return parsed;
  };
  const list = (name: string): string[] =>
    (text(name) ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const secret = required('JWT_ACCESS_SECRET');
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_ACCESS_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres`);
  }

  const port = positiveInt('PORT', 4000);
  const nodeEnv = text('NODE_ENV') ?? 'development';
  const provider = text('AI_PROVIDER') ?? 'gemini';
  if (provider !== 'gemini' && provider !== 'fake')
    throw new Error('AI_PROVIDER debe ser gemini o fake');
  if (provider === 'fake' && nodeEnv === 'production')
    throw new Error('AI_PROVIDER=fake no está permitido en producción');
  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: required('DATABASE_URL'),
    PUBLIC_API_URL: (text('PUBLIC_API_URL') ?? `http://localhost:${port}`).replace(/\/+$/, ''),
    CORS_ORIGINS: list('CORS_ORIGINS'),
    SWAGGER_ENABLED: text('SWAGGER_ENABLED') === 'true',
    JWT_ACCESS_SECRET: secret,
    JWT_ACCESS_TTL_SECONDS: positiveInt('JWT_ACCESS_TTL_SECONDS', 900),
    REFRESH_TOKEN_TTL_DAYS: positiveInt('REFRESH_TOKEN_TTL_DAYS', 30),
    GOOGLE_WEB_CLIENT_ID: text('GOOGLE_WEB_CLIENT_ID'),
    GOOGLE_EXTRA_AUDIENCES: list('GOOGLE_EXTRA_AUDIENCES'),
    RELEASES_STORAGE_DIR: text('RELEASES_STORAGE_DIR'),
    GEMINI_API_KEY: text('GEMINI_API_KEY'),
    GEMINI_MODEL: text('GEMINI_MODEL') ?? 'gemini-3.8-flash',
    GEMINI_ENABLED: text('GEMINI_ENABLED') !== 'false',
    AI_PROVIDER: provider,
    AI_TIMEOUT_MS: positiveInt('AI_TIMEOUT_MS', 25000),
    AI_RATE_LIMIT_PER_MINUTE: positiveInt('AI_RATE_LIMIT_PER_MINUTE', 5),
    AI_RATE_LIMIT_PER_DAY: positiveInt('AI_RATE_LIMIT_PER_DAY', 100),
  };
}
