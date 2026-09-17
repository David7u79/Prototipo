import { createHash } from 'node:crypto';
import {
  buildMovementContext,
  buildProgressContext,
  buildWodContext,
  buildWorkoutContext,
  EMPTY_SCORE,
  resolveEvidence,
  stableStringify,
  toCanonical,
  totalVolumeKg,
  unknownEvidenceIds,
  type AiAnalysisType,
  type AiContextBundle,
  type AiModelOutput,
} from '@garfit/domain';
import {
  EQUIPMENT_LABELS,
  MOVEMENT_CATEGORY_LABELS,
  MOVEMENT_DIFFICULTY_LABELS,
  MUSCLE_GROUP_LABELS,
} from '@garfit/movements';
import type { AiAnalysisResponse, AiConsentResponse, AiStatusResponse } from '@garfit/types';
import { aiModelOutputJsonSchema, aiModelOutputSchema } from '@garfit/validation';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../common/config/env.js';
import { ApiException } from '../common/api-exception.filter.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WorkoutsService } from '../workouts/workouts.service.js';
import { buildAiUserContent } from './ai-prompt.js';
import { AiProvider, AiProviderError } from './ai.provider.js';
import { PROMPT_VERSION, SYSTEM_INSTRUCTION } from './prompts/progress-analysis.js';
import {
  PROMPT_VERSION as MOVEMENT_PROMPT_VERSION,
  SYSTEM_INSTRUCTION as MOVEMENT_SYSTEM_INSTRUCTION,
} from './prompts/movement-explanation.js';
import {
  PROMPT_VERSION as WOD_PROMPT_VERSION,
  SYSTEM_INSTRUCTION as WOD_SYSTEM_INSTRUCTION,
} from './prompts/wod-explanation.js';
import {
  PROMPT_VERSION as WORKOUT_PROMPT_VERSION,
  SYSTEM_INSTRUCTION as WORKOUT_SYSTEM_INSTRUCTION,
} from './prompts/workout-analysis.js';
import { ProgressSnapshotService } from './progress-snapshot.service.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly usage = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshots: ProgressSnapshotService,
    private readonly workouts: WorkoutsService,
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

  async analyzeWorkout(userId: string, workoutId: string): Promise<AiAnalysisResponse> {
    const workout = await this.workouts.get(userId, workoutId);
    if (workout.status !== 'COMPLETED') {
      throw new ApiException(
        409,
        'WORKOUT_INVALID_STATE',
        'El entrenamiento debe estar completado',
      );
    }
    const movementIds = workout.exercises.map((exercise) => exercise.movement.slug);
    const previousRows = await this.prisma.workout.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'COMPLETED',
        performedOn: { lt: new Date(`${workout.performedOn!}T00:00:00.000Z`) },
        exercises: { some: { movement: { slug: { in: movementIds } } } },
      },
      include: { exercises: { include: { movement: true, results: true } } },
      orderBy: [{ performedOn: 'desc' }, { createdAt: 'desc' }],
    });
    const previousWorkouts = new Map<
      string,
      { movementName: string; performedOn: string; volumeKg: number }
    >();
    for (const row of previousRows) {
      for (const exercise of row.exercises) {
        if (
          !movementIds.includes(exercise.movement.slug) ||
          previousWorkouts.has(exercise.movement.slug)
        ) {
          continue;
        }
        previousWorkouts.set(exercise.movement.slug, {
          movementName: exercise.movement.name,
          performedOn: row.performedOn!.toISOString().slice(0, 10),
          volumeKg: totalVolumeKg(
            exercise.results.map((result) => ({
              reps: result.reps,
              loadKg: result.loadKg === null ? null : Number(result.loadKg),
            })),
          ),
        });
      }
    }
    const context = buildWorkoutContext({
      name: workout.name,
      description: workout.description,
      notes: workout.notes,
      workoutType: workout.workoutType,
      performedOn: workout.performedOn!,
      score: workout.score ?? EMPTY_SCORE,
      exercises: workout.exercises.map((exercise) => ({
        position: exercise.position,
        movementSlug: exercise.movement.slug,
        movementName: exercise.movement.name,
        notes: exercise.notes,
        sets: exercise.results.map((result) => ({
          setNumber: result.setNumber,
          reps: result.reps,
          loadKg: result.loadKg,
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
        })),
      })),
      personalRecords: workout.personalRecords.map(({ record, previousBest }) => ({
        movementSlug: record.movement.slug,
        movementName: record.movement.name,
        recordType: record.recordType,
        repetitions: record.repetitions,
        distanceMeters: record.distanceMeters,
        value: record.normalizedValue,
        previousBest,
      })),
      previousWorkouts: [...previousWorkouts].map(([movementSlug, previous]) => ({
        movementSlug,
        ...previous,
      })),
    });
    return this.process({
      userId,
      type: 'WORKOUT_ANALYSIS',
      promptVersion: WORKOUT_PROMPT_VERSION,
      systemInstruction: WORKOUT_SYSTEM_INSTRUCTION,
      task: 'Analiza este entrenamiento completado usando exclusivamente los hechos recibidos.',
      targetId: workoutId,
      periodDays: null,
      context,
    });
  }

  async explainWod(userId: string, slug: string): Promise<AiAnalysisResponse> {
    const wod = await this.prisma.wod.findFirst({
      where: { slug, OR: [{ ownerId: null }, { ownerId: userId }] },
      include: { exercises: { include: { movement: true }, orderBy: { position: 'asc' } } },
    });
    if (!wod) throw new ApiException(404, 'WOD_NOT_FOUND', 'No encontramos ese WOD');
    const context = buildWodContext({
      name: wod.name,
      description: wod.description,
      workoutType: wod.workoutType,
      isBenchmark: wod.isBenchmark,
      durationSeconds: wod.durationSeconds,
      rounds: wod.rounds,
      intervalSeconds: wod.intervalSeconds,
      repScheme: wod.repScheme,
      exercises: wod.exercises.map((exercise) => ({
        position: exercise.position,
        movementSlug: exercise.movement.slug,
        movementName: exercise.movement.name,
        equipment: EQUIPMENT_LABELS[exercise.movement.equipment],
        reps: exercise.reps,
        loadKg:
          exercise.loadValue === null || exercise.loadUnit === null
            ? null
            : toCanonical(Number(exercise.loadValue), exercise.loadUnit),
        distanceMeters:
          exercise.distanceValue === null || exercise.distanceUnit === null
            ? null
            : toCanonical(Number(exercise.distanceValue), exercise.distanceUnit),
        durationSeconds: exercise.durationSeconds,
        notes: exercise.notes,
      })),
    });
    return this.process({
      userId,
      type: 'WOD_EXPLANATION',
      promptVersion: WOD_PROMPT_VERSION,
      systemInstruction: WOD_SYSTEM_INSTRUCTION,
      task: 'Explica este WOD usando exclusivamente los hechos recibidos.',
      targetId: slug,
      periodDays: null,
      context,
    });
  }

  async explainMovement(userId: string, slug: string): Promise<AiAnalysisResponse> {
    const movement = await this.prisma.movement.findFirst({ where: { slug, isActive: true } });
    if (!movement) {
      throw new ApiException(404, 'MOVEMENT_NOT_FOUND', 'No encontramos ese movimiento');
    }
    const context = buildMovementContext({
      name: movement.name,
      description: movement.description,
      category: MOVEMENT_CATEGORY_LABELS[movement.category],
      equipment: EQUIPMENT_LABELS[movement.equipment],
      difficulty: movement.difficulty ? MOVEMENT_DIFFICULTY_LABELS[movement.difficulty] : null,
      primaryMuscles: movement.primaryMuscles.map((muscle) => MUSCLE_GROUP_LABELS[muscle]),
      secondaryMuscles: movement.secondaryMuscles.map((muscle) => MUSCLE_GROUP_LABELS[muscle]),
      instructions: movement.instructions,
      recordTypes: movement.recordTypes,
    });
    return this.process({
      userId,
      type: 'MOVEMENT_EXPLANATION',
      promptVersion: MOVEMENT_PROMPT_VERSION,
      systemInstruction: MOVEMENT_SYSTEM_INSTRUCTION,
      task: 'Explica este movimiento usando exclusivamente los datos del catálogo recibidos.',
      targetId: slug,
      periodDays: null,
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
