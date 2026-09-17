import { createHash } from 'node:crypto';
import {
  buildProgressContext,
  resolveEvidence,
  stableStringify,
  unknownEvidenceIds,
  type AiAnalysisType,
  type AiContextBundle,
  type AiModelOutput,
} from '@garfit/domain';
import type { AiAnalysisResponse, AiConsentResponse, AiStatusResponse } from '@garfit/types';
import { aiModelOutputJsonSchema, aiModelOutputSchema } from '@garfit/validation';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../common/config/env.js';
import { ApiException } from '../common/api-exception.filter.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildAiUserContent } from './ai-prompt.js';
import { AiProvider, AiProviderError } from './ai.provider.js';
import { PROMPT_VERSION, SYSTEM_INSTRUCTION } from './prompts/progress-analysis.js';
import { ProgressSnapshotService } from './progress-snapshot.service.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly usage = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshots: ProgressSnapshotService,
    private readonly provider: AiProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async status(userId: string): Promise<AiStatusResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { aiConsentAt: true },
    });
    return {
      enabled: this.config.get('GEMINI_ENABLED', { infer: true }),
      configured: this.provider.isConfigured(),
      provider: this.provider.name,
      model: this.provider.model,
      consentGivenAt: user.aiConsentAt?.toISOString() ?? null,
    };
  }

  async giveConsent(userId: string): Promise<AiConsentResponse> {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { aiConsentAt: true },
    });
    if (current.aiConsentAt) return { consentGivenAt: current.aiConsentAt.toISOString() };
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { aiConsentAt: new Date() },
      select: { aiConsentAt: true },
    });
    return { consentGivenAt: user.aiConsentAt?.toISOString() ?? null };
  }

  async revokeConsent(userId: string): Promise<AiConsentResponse> {
    await this.prisma.user.update({ where: { id: userId }, data: { aiConsentAt: null } });
    return { consentGivenAt: null };
  }

  async analyzeProgress(userId: string, periodDays: 30 | 60 | 90): Promise<AiAnalysisResponse> {
    const context = buildProgressContext(
      await this.snapshots.build(userId, new Date(), periodDays),
    );
    return this.process({
      userId,
      type: 'PROGRESS_ANALYSIS',
      promptVersion: PROMPT_VERSION,
      systemInstruction: SYSTEM_INSTRUCTION,
      task: 'Analiza el progreso del periodo y ofrece observaciones y sugerencias prudentes.',
      targetId: null,
      periodDays,
      context,
    });
  }

  private async process(input: {
    userId: string;
    type: AiAnalysisType;
    promptVersion: string;
    systemInstruction: string;
    task: string;
    targetId: string | null;
    periodDays: number | null;
    context: AiContextBundle;
  }): Promise<AiAnalysisResponse> {
    this.ensureAvailable();
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { aiConsentAt: true },
    });
    if (!user.aiConsentAt) {
      throw new ApiException(403, 'AI_CONSENT_REQUIRED', 'Necesitas aceptar el uso de IA');
    }
    if (!input.context.sufficient)
      return this.insufficient(input.type, input.periodDays, input.context);
    const contextHash = createHash('sha256')
      .update(
        stableStringify({
          type: input.type,
          targetId: input.targetId,
          periodDays: input.periodDays,
          promptVersion: input.promptVersion,
          facts: input.context.facts,
          dataUsed: input.context.dataUsed,
        }),
      )
      .digest('hex');
    const cached = await this.prisma.aiAnalysis.findFirst({
      where: {
        userId: input.userId,
        contextHash,
        promptVersion: input.promptVersion,
        model: this.provider.model,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (cached) return this.response(cached, true);
    this.consume(input.userId);
    const started = Date.now();
    const output = await this.generate(input);
    const row = await this.prisma.aiAnalysis.create({
      data: {
        userId: input.userId,
        type: input.type,
        targetId: input.targetId,
        periodDays: input.periodDays,
        provider: this.provider.name,
        model: this.provider.model,
        promptVersion: input.promptVersion,
        contextHash,
        status: output.status,
        responseJson: JSON.parse(
          JSON.stringify({ output, facts: input.context.facts, dataUsed: input.context.dataUsed }),
        ),
        durationMs: Date.now() - started,
      },
    });
    this.logger.log(`type=${input.type} model=${this.provider.model} durationMs=${row.durationMs}`);
    return this.response(row, false);
  }

  private ensureAvailable(): void {
    if (!this.config.get('GEMINI_ENABLED', { infer: true })) {
      throw new ApiException(503, 'AI_DISABLED', 'La IA está desactivada');
    }
    if (!this.provider.isConfigured()) {
      throw new ApiException(503, 'AI_NOT_CONFIGURED', 'La IA no está configurada');
    }
  }

  private consume(userId: string): void {
    const now = Date.now();
    const entries = (this.usage.get(userId) ?? []).filter((time) => now - time < 86_400_000);
    const minuteCount = entries.filter((time) => now - time < 60_000).length;
    if (
      minuteCount >= this.config.get('AI_RATE_LIMIT_PER_MINUTE', { infer: true }) ||
      entries.length >= this.config.get('AI_RATE_LIMIT_PER_DAY', { infer: true })
    ) {
      throw new ApiException(429, 'AI_RATE_LIMITED', 'Límite de análisis alcanzado');
    }
    entries.push(now);
    this.usage.set(userId, entries);
  }

  private async generate(input: {
    type: AiAnalysisType;
    systemInstruction: string;
    task: string;
    periodDays: number | null;
    context: AiContextBundle;
  }): Promise<AiModelOutput> {
    let correction: string | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await this.provider.generate({
          operation: input.type,
          systemInstruction: input.systemInstruction,
          userContent: buildAiUserContent(
            input.type,
            input.task,
            input.periodDays,
            input.context,
            correction,
          ),
          responseJsonSchema: aiModelOutputJsonSchema,
        });
        const parsed = aiModelOutputSchema.safeParse(JSON.parse(result.text));
        if (parsed.success && unknownEvidenceIds(parsed.data, input.context.facts).length === 0) {
          return parsed.data;
        }
        correction = 'La salida no cumple el esquema o cita evidencia inexistente.';
      } catch (error) {
        if (error instanceof AiProviderError) {
          if (error.kind === 'RATE_LIMITED') {
            throw new ApiException(429, 'AI_RATE_LIMITED', 'Límite del proveedor alcanzado');
          }
          if (error.retryable && attempt === 1) {
            throw new ApiException(503, 'AI_PROVIDER_UNAVAILABLE', 'El proveedor no respondió');
          }
          if (!error.retryable) {
            throw new ApiException(500, 'AI_ANALYSIS_FAILED', 'No fue posible generar el análisis');
          }
        }
        correction = 'La respuesta debe ser JSON válido con evidencias existentes.';
      }
    }
    throw new ApiException(502, 'AI_INVALID_RESPONSE', 'La respuesta de IA no fue válida');
  }

  private insufficient(
    type: AiAnalysisType,
    periodDays: number | null,
    context: AiContextBundle,
  ): AiAnalysisResponse {
    return {
      id: null,
      type,
      status: 'INSUFFICIENT_DATA',
      cached: false,
      provider: null,
      model: null,
      promptVersion: null,
      generatedAt: new Date().toISOString(),
      periodDays,
      summary: 'No hay datos suficientes para generar una respuesta.',
      observations: [],
      suggestions: [],
      limitations: [],
      missingData: ['Datos deportivos suficientes'],
      dataUsed: context.dataUsed,
    };
  }

  private response(
    row: {
      id: string;
      type: AiAnalysisType;
      periodDays: number | null;
      provider: string;
      model: string;
      promptVersion: string;
      status: 'COMPLETED' | 'INSUFFICIENT_DATA';
      createdAt: Date;
      responseJson: unknown;
    },
    cached: boolean,
  ): AiAnalysisResponse {
    const json = row.responseJson as {
      output: AiModelOutput;
      facts: never[];
      dataUsed: never[];
    };
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      cached,
      provider: row.provider as 'GEMINI' | 'FAKE',
      model: row.model,
      promptVersion: row.promptVersion,
      generatedAt: row.createdAt.toISOString(),
      periodDays: row.periodDays,
      summary: json.output.summary,
      observations: json.output.observations.map((item) => ({
        title: item.title,
        description: item.description,
        evidence: resolveEvidence(item.evidenceIds, json.facts),
      })),
      suggestions: json.output.suggestions.map((item) => ({
        title: item.title,
        description: item.description,
        evidence: resolveEvidence(item.evidenceIds, json.facts),
      })),
      limitations: json.output.limitations,
      missingData: json.output.missingData,
      dataUsed: json.dataUsed,
    };
  }
}
