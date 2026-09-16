/**
 * Frontera con proveedores de IA generativa. Fase 1: sólo existe el contrato.
 *
 * Regla de diseño: PRs, porcentajes, volúmenes y estadísticas se calculan en código
 * determinista dentro de la API. El modelo recibe esos resultados ya calculados como contexto
 * estructurado y se usa para interpretar, explicar y redactar, nunca para hacer las cuentas.
 * Ningún cliente (web o móvil) llama al proveedor directamente ni conoce su API key.
 */
export interface AiRequest {
  /** Instrucciones del sistema construidas por la API. */
  system: string;
  /** Pregunta o tarea del atleta. */
  prompt: string;
  /** Datos del atleta ya calculados y serializados por la API. */
  context: Record<string, unknown>;
}

export interface AiResponse {
  text: string;
  model: string;
}

export abstract class AiProvider {
  abstract generate(request: AiRequest): Promise<AiResponse>;
}
