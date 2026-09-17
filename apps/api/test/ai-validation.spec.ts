import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiProvider, AiProviderError } from '../src/ai/ai.provider.js';
import { FakeAiProvider } from '../src/ai/fake-ai.provider.js';
import { createTestApp, resetDatabase, type TestApp } from './app.js';
import { bearer, daysAgo, registerUser, seedTestMovements } from './helpers.js';

describe('IA: validación, disponibilidad y caché', () => {
  let ctx: TestApp;
  let provider: FakeAiProvider;
  let token: string;

  const server = () => ctx.app.getHttpServer();
  const analyze = (periodDays = 30) =>
    request(server()).post('/ai/analyze/progress').set(bearer(token)).send({ periodDays });
  const valid = (evidenceId: string) =>
    JSON.stringify({
      status: 'COMPLETED',
      summary: 'Resumen válido.',
      observations: [
        {
          title: 'Observación válida',
          description: 'Hecho registrado.',
          evidenceIds: [evidenceId],
        },
      ],
      suggestions: [],
      limitations: [],
      missingData: [],
    });

  beforeAll(async () => {
    provider = new FakeAiProvider();
    ctx = await createTestApp((builder) => builder.overrideProvider(AiProvider).useValue(provider));
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetDatabase(ctx.prisma);
    await seedTestMovements(ctx.prisma);
    token = await registerUser(ctx.app);
    await request(server())
      .post('/records')
      .set(bearer(token))
      .send({
        movementSlug: 'barbell-full-squat',
        recordType: 'WEIGHT',
        value: 100,
        unit: 'KILOGRAM',
        repetitions: 1,
        performedAt: daysAgo(4),
      })
      .expect(201);
    await request(server()).post('/ai/consent').set(bearer(token)).expect(200);
  });

  afterAll(async () => ctx.app.close());

  it('rechaza texto no JSON después de un único reintento', async () => {
    provider.enqueue('no soy JSON');
    provider.enqueue('tampoco soy JSON');

    const response = await analyze().expect(502);

    expect(response.body.code).toBe('AI_INVALID_RESPONSE');
  });

  it('rechaza salidas que incumplen el esquema', async () => {
    for (const output of [
      { status: 'COMPLETED', observations: [], suggestions: [], limitations: [], missingData: [] },
      {
        status: 'COMPLETED',
        summary: 'x',
        observations: [],
        suggestions: [],
        limitations: [],
        missingData: [],
        extra: true,
      },
      {
        status: 'COMPLETED',
        summary: 'x',
        observations: Array.from({ length: 7 }, () => ({
          title: 'x',
          description: 'x',
          evidenceIds: ['pr:barbell-full-squat:weight-1rm:best'],
        })),
        suggestions: [],
        limitations: [],
        missingData: [],
      },
    ]) {
      provider.enqueue(JSON.stringify(output));
      provider.enqueue(JSON.stringify(output));
      expect((await analyze()).body.code).toBe('AI_INVALID_RESPONSE');
    }
  });

  it('no persiste una salida que cita evidencia inexistente', async () => {
    provider.enqueue(valid('pr:snatch:weight-1rm:best'));
    provider.enqueue(valid('pr:snatch:weight-1rm:best'));

    const response = await analyze().expect(502);

    expect(response.body.code).toBe('AI_INVALID_RESPONSE');
    expect(await ctx.prisma.aiAnalysis.count()).toBe(0);
  });

  it('acepta la segunda respuesta cuando corrige la primera', async () => {
    const generate = vi.spyOn(provider, 'generate');
    provider.enqueue('salida rota');
    provider.enqueue(valid('pr:barbell-full-squat:weight-1rm:best'));

    expect((await analyze().expect(200)).body.status).toBe('COMPLETED');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('normaliza errores del proveedor sin revelar su mensaje', async () => {
    const cases = [
      {
        errors: [
          new AiProviderError('TIMEOUT', 'secreto timeout'),
          new AiProviderError('TIMEOUT', 'secreto timeout'),
        ],
        status: 503,
        code: 'AI_PROVIDER_UNAVAILABLE',
      },
      {
        errors: [new AiProviderError('RATE_LIMITED', 'secreto rate', 429)],
        status: 429,
        code: 'AI_RATE_LIMITED',
      },
      {
        errors: [new AiProviderError('AUTH', 'secreto auth')],
        status: 500,
        code: 'AI_ANALYSIS_FAILED',
      },
    ];

    for (const item of cases) {
      for (const error of item.errors) provider.enqueue(error);
      const response = await analyze().expect(item.status);
      expect(response.body.code).toBe(item.code);
      expect(JSON.stringify(response.body)).not.toContain('secreto');
    }
  });

  it('reutiliza el análisis idéntico sin invocar de nuevo al proveedor', async () => {
    const generate = vi.spyOn(provider, 'generate');

    const first = await analyze().expect(200);
    const second = await analyze().expect(200);

    expect(second.body).toMatchObject({
      id: first.body.id,
      generatedAt: first.body.generatedAt,
      cached: true,
    });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('invalida la caché cuando cambian los datos y por periodo', async () => {
    const generate = vi.spyOn(provider, 'generate');
    await analyze().expect(200);
    await request(server())
      .post('/records')
      .set(bearer(token))
      .send({
        movementSlug: 'barbell-full-squat',
        recordType: 'WEIGHT',
        value: 105,
        unit: 'KILOGRAM',
        repetitions: 1,
        performedAt: daysAgo(1),
      })
      .expect(201);

    expect((await analyze().expect(200)).body.cached).toBe(false);
    expect((await analyze(60).expect(200)).body.cached).toBe(false);
    expect(generate).toHaveBeenCalledTimes(3);
  });
});
