import { ApiError, GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../common/config/env.js';
import {
  AiProvider,
  AiProviderError,
  type AiGenerationRequest,
  type AiGenerationResult,
} from './ai.provider.js';

@Injectable()
export class GeminiAiProvider extends AiProvider {
  readonly name = 'GEMINI' as const;
  readonly model: string;
  private client: GoogleGenAI | null = null;
  constructor(private readonly config: ConfigService<Env, true>) {
    super();
    this.model = config.get('GEMINI_MODEL', { infer: true });
  }
  isConfigured(): boolean {
    return this.config.get('GEMINI_API_KEY', { infer: true }) !== null;
  }
  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    try {
      const timeoutMs = this.config.get('AI_TIMEOUT_MS', { infer: true });
      const response = await this.getClient().models.generateContent({
        model: this.model,
        contents: request.userContent,
        config: {
          systemInstruction: request.systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: request.responseJsonSchema,
          temperature: 0.2,
          maxOutputTokens: 2048,
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });
      if (!response.text) throw new AiProviderError('BAD_REQUEST', 'Respuesta vacía');
      return {
        text: response.text,
        model: this.model,
        usage: response.usageMetadata
          ? {
              inputTokens: response.usageMetadata.promptTokenCount ?? 0,
              outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            }
          : null,
      };
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (error instanceof ApiError) {
        if (error.status === 429)
          throw new AiProviderError('RATE_LIMITED', 'Límite del proveedor', error.status);
        if (error.status === 401 || error.status === 403)
          throw new AiProviderError('AUTH', 'Credenciales inválidas', error.status);
        if ([400, 404, 422].includes(error.status))
          throw new AiProviderError('BAD_REQUEST', 'Solicitud inválida', error.status);
        if (error.status >= 500)
          throw new AiProviderError('UNAVAILABLE', 'Proveedor no disponible', error.status);
      }
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.name === 'TimeoutError' ||
          /abort|timeout/i.test(error.message))
      )
        throw new AiProviderError('TIMEOUT', 'Tiempo agotado');
      throw new AiProviderError('UNAVAILABLE', 'Error de red');
    }
  }
  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const apiKey = this.config.get('GEMINI_API_KEY', { infer: true });
    if (!apiKey) throw new AiProviderError('AUTH', 'Gemini no configurado');
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: this.config.get('AI_TIMEOUT_MS', { infer: true }),
        retryOptions: { attempts: 1 },
      },
    });
    return this.client;
  }
}
