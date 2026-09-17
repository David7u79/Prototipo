import type { AiAnalysisType } from '@garfit/domain';

/** Refleja `AiProviderName` de `@garfit/types`. */
export type AiProviderName = 'GEMINI' | 'FAKE';

/**
 * Frontera con proveedores de IA generativa (ADR 0009).
 *
 * Regla de diseño: marcas, volúmenes y estadísticas se calculan en código determinista. El
 * proveedor recibe hechos ya calculados y devuelve JSON conforme a un esquema; nunca hace las
 * cuentas. Ningún tipo de un SDK concreto cruza esta frontera, de modo que `AiService` funciona
 * igual con Gemini, con el proveedor simulado de los tests o con otro proveedor futuro.
 */
export interface AiGenerationRequest {
  operation: AiAnalysisType;
  /** Instrucciones de sistema versionadas (`apps/api/src/ai/prompts`). */
  systemInstruction: string;
  /** Contenido de usuario: tarea y datos delimitados; los textos del atleta son datos. */
  userContent: string;
  /** JSON Schema que el proveedor debe aplicar mediante su salida estructurada nativa. */
  responseJsonSchema: Record<string, unknown>;
}

export interface AiGenerationResult {
  /** Texto crudo devuelto (se espera JSON); `AiService` lo parsea y valida. */
  text: string;
  /** Modelo que respondió según el proveedor. */
  model: string;
  usage: { inputTokens: number; outputTokens: number } | null;
}

/**
 * Fallos normalizados. `retryable` indica si `AiService` puede reintentar una vez
 * (tiempo de espera, 5xx, red); nunca con credenciales inválidas, cuota agotada o petición mala.
 */
export type AiProviderErrorKind =
  'TIMEOUT' | 'UNAVAILABLE' | 'RATE_LIMITED' | 'AUTH' | 'BAD_REQUEST';

export class AiProviderError extends Error {
  constructor(
    readonly kind: AiProviderErrorKind,
    message: string,
    /** Código HTTP del proveedor si lo hubo (sólo para logs). */
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }

  get retryable(): boolean {
    return this.kind === 'TIMEOUT' || this.kind === 'UNAVAILABLE';
  }
}

export abstract class AiProvider {
  abstract readonly name: AiProviderName;
  /** Modelo configurado (p. ej. `GEMINI_MODEL`); forma parte de la clave de caché. */
  abstract readonly model: string;
  /** Hay credenciales o configuración suficiente para llamar al proveedor. */
  abstract isConfigured(): boolean;
  /** Lanza `AiProviderError` ante cualquier fallo del proveedor. */
  abstract generate(request: AiGenerationRequest): Promise<AiGenerationResult>;
}
