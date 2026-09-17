import { BASE_SYSTEM_INSTRUCTION } from './base.js';
export const PROMPT_VERSION = 'workout-v1';
export const SYSTEM_INSTRUCTION = `${BASE_SYSTEM_INSTRUCTION}
Explica qué ocurrió durante el entrenamiento y qué hechos destacan.
Compáralo sólo con el historial explícitamente recibido.
Menciona las marcas personales producidas cuando consten en los hechos.
No recalcules volumen, marcas, cambios ni ninguna otra métrica.`;
