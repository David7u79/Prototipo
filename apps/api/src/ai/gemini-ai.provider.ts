import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  AiProviderError,
  type AiGenerationRequest,
  type AiGenerationResult,
} from './ai.provider.js';

/** Implementación con Google Gemini (`@google/genai`). Pendiente en esta rama. */
@Injectable()
export class GeminiAiProvider extends AiProvider {
  readonly name = 'GEMINI' as const;
  readonly model = 'gemini';

  isConfigured(): boolean {
    return false;
  }

  generate(_request: AiGenerationRequest): Promise<AiGenerationResult> {
    return Promise.reject(new AiProviderError('BAD_REQUEST', 'Gemini aún no está implementado'));
  }
}
