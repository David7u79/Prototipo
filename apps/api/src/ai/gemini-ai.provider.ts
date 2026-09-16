import { Injectable, NotImplementedException } from '@nestjs/common';
import { AiProvider, type AiRequest, type AiResponse } from './ai.provider.js';

/**
 * Implementación prevista con Google Gemini (GEMINI_API_KEY y GEMINI_MODEL en el servidor).
 * Se completará en la fase del asistente; hoy no hay endpoint que la use.
 */
@Injectable()
export class GeminiAiProvider extends AiProvider {
  generate(_request: AiRequest): Promise<AiResponse> {
    return Promise.reject(
      new NotImplementedException('La integración con Gemini llega en una fase posterior'),
    );
  }
}
