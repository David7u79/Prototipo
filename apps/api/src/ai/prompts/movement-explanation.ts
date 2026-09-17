import { BASE_SYSTEM_INSTRUCTION } from './base.js';
export const PROMPT_VERSION = 'movement-v1';
export const SYSTEM_INSTRUCTION = `${BASE_SYSTEM_INSTRUCTION}
Explica qué es el movimiento conforme a la descripción del catálogo.
Indica el equipamiento, los músculos registrados y las instrucciones disponibles.
Menciona los tipos de marca admitidos si constan en los hechos.
El catálogo es la fuente primaria: no inventes ni completes su descripción.`;
