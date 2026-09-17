import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, toQueryString } from './index.js';

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('cliente API', () => {
  it('envía Authorization sólo en llamadas autenticadas', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ ok: true }));
    const client = createApiClient({ baseUrl: 'http://api', getAccessToken: () => 'token', fetch });
    await client.health();
    await client.auth.me();
    const first = fetch.mock.calls[0]?.[1] as RequestInit;
    const second = fetch.mock.calls[1]?.[1] as RequestInit;
    expect((first.headers as Record<string, string>).Authorization).toBeUndefined();
    expect((second.headers as Record<string, string>).Authorization).toBe('Bearer token');
  });

  it('convierte 204 en undefined', async () => {
    const client = createApiClient({
      baseUrl: 'http://api',
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    });
    await expect(client.auth.logout('refresh')).resolves.toBeUndefined();
  });

  it('normaliza cuerpo de error como ApiError', async () => {
    const client = createApiClient({
      baseUrl: 'http://api',
      fetch: vi.fn().mockResolvedValue(response({ code: 'BAD', message: 'falló' }, 400)),
    });
    await expect(client.health()).rejects.toMatchObject({ status: 400, code: 'BAD' });
  });

  it('normaliza fallo de red', async () => {
    const client = createApiClient({
      baseUrl: 'http://api',
      fetch: vi.fn().mockRejectedValue(new Error('red')),
    });
    await expect(client.health()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('devuelve null en 404 de latestAndroid y relanza otros errores', async () => {
    const missing = createApiClient({
      baseUrl: 'http://api',
      fetch: vi.fn().mockResolvedValue(response({ message: 'no' }, 404)),
    });
    await expect(missing.releases.latestAndroid()).resolves.toBeNull();
    const failed = createApiClient({
      baseUrl: 'http://api',
      fetch: vi.fn().mockResolvedValue(response({ message: 'no' }, 500)),
    });
    await expect(failed.releases.latestAndroid()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('rutas de recursos', () => {
  it('omite valores vacíos y codifica parámetros de consulta', () => {
    expect(toQueryString({ search: 'a b&c', page: 2, nil: null, none: undefined, empty: '' })).toBe(
      '?search=a+b%26c&page=2',
    );
  });

  it('construye rutas de movimientos, marcas, WODs y entrenamientos autenticadas', async () => {
    const fetch = vi.fn().mockResolvedValue(response({}));
    const client = createApiClient({ baseUrl: 'http://api/', getAccessToken: () => 't', fetch });
    await client.movements.list({ search: 'pull up', page: 2 });
    await client.movements.get('a/b');
    await client.records.overview();
    await client.records.summary();
    await client.records.forMovement('a/b');
    await client.records.create({ value: 1 } as never);
    await client.records.update('a/b', { notes: 'x' });
    await client.wods.list({ benchmark: true });
    await client.wods.get('a/b');
    await client.wods.create({} as never);
    await client.workouts.list({ page: 2 });
    await client.workouts.stats();
    await client.workouts.get('a/b');
    await client.workouts.create({} as never);
    await client.workouts.update('a/b', { name: 'x' });
    await client.workouts.start('a/b');
    await client.workouts.saveResults('a/b', {} as never);
    await client.workouts.complete('a/b');
    const calls = fetch.mock.calls.map(([url, init]) => [
      url,
      (init as RequestInit).method,
      (init as RequestInit).body,
      ((init as RequestInit).headers as Record<string, string>).Authorization,
    ]);
    expect(calls).toContainEqual([
      'http://api/movements?search=pull+up&page=2',
      'GET',
      undefined,
      'Bearer t',
    ]);
    expect(calls).toContainEqual(['http://api/movements/a%2Fb', 'GET', undefined, 'Bearer t']);
    expect(calls).toContainEqual(['http://api/records/summary', 'GET', undefined, 'Bearer t']);
    expect(calls).toContainEqual(['http://api/records/a%2Fb', 'GET', undefined, 'Bearer t']);
    expect(calls).toContainEqual(['http://api/wods?benchmark=true', 'GET', undefined, 'Bearer t']);
    expect(calls).toContainEqual([
      'http://api/workouts/a%2Fb/start',
      'POST',
      undefined,
      'Bearer t',
    ]);
    expect(calls).toContainEqual(['http://api/workouts/a%2Fb/results', 'PUT', '{}', 'Bearer t']);
    expect(calls).toContainEqual(['http://api/workouts/a%2Fb/complete', 'POST', '{}', 'Bearer t']);
  });

  it('usa DELETE y devuelve undefined para borrar una marca o entrenamiento', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createApiClient({ baseUrl: 'http://api', getAccessToken: () => 't', fetch });
    await expect(client.records.remove('a/b')).resolves.toBeUndefined();
    await expect(client.workouts.remove('a/b')).resolves.toBeUndefined();
    expect(fetch.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['http://api/records/a%2Fb', 'DELETE'],
      ['http://api/workouts/a%2Fb', 'DELETE'],
    ]);
  });

  it('conserva código y details de errores de conflicto y validación', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ code: 'RECORD_MANAGED_BY_WORKOUT', message: 'x' }, 409))
      .mockResolvedValueOnce(
        response({ code: 'WORKOUT_INCOMPLETE', message: 'x', details: ['set'] }, 422),
      );
    const client = createApiClient({ baseUrl: 'http://api', fetch });
    await expect(client.records.overview()).rejects.toMatchObject({
      status: 409,
      code: 'RECORD_MANAGED_BY_WORKOUT',
    });
    await expect(client.workouts.stats()).rejects.toMatchObject({
      status: 422,
      code: 'WORKOUT_INCOMPLETE',
      body: { details: ['set'] },
    });
  });
});

describe('cliente de IA', () => {
  it('consulta el estado autenticado del servicio', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ enabled: true }));
    const client = createApiClient({ baseUrl: 'http://api', getAccessToken: () => 'token', fetch });

    await client.ai.status();

    expect(fetch).toHaveBeenCalledWith('http://api/ai/status', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer token',
      },
      body: undefined,
    });
  });

  it('otorga y revoca el consentimiento con los métodos correctos', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ consentGivenAt: null }));
    const client = createApiClient({ baseUrl: 'http://api', getAccessToken: () => 'token', fetch });

    await client.ai.giveConsent();
    await client.ai.revokeConsent();

    expect(fetch.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['http://api/ai/consent', 'POST'],
      ['http://api/ai/consent', 'DELETE'],
    ]);
  });

  it('analiza el progreso con el período solicitado o un cuerpo vacío', async () => {
    const fetch = vi.fn().mockResolvedValue(response({}));
    const client = createApiClient({ baseUrl: 'http://api', getAccessToken: () => 'token', fetch });

    await client.ai.analyzeProgress({ periodDays: 60 });
    await client.ai.analyzeProgress();

    expect(
      fetch.mock.calls.map(([url, init]) => [
        url,
        (init as RequestInit).method,
        (init as RequestInit).body,
      ]),
    ).toEqual([
      ['http://api/ai/analyze/progress', 'POST', '{"periodDays":60}'],
      ['http://api/ai/analyze/progress', 'POST', '{}'],
    ]);
  });

  it('construye y codifica las rutas de análisis y explicación', async () => {
    const fetch = vi.fn().mockResolvedValue(response({}));
    const client = createApiClient({ baseUrl: 'http://api', getAccessToken: () => 'token', fetch });

    await client.ai.analyzeWorkout('workout/1');
    await client.ai.explainWod('back squat/1');
    await client.ai.explainMovement('back squat/1');

    expect(fetch.mock.calls.map(([url, init]) => [url, (init as RequestInit).method])).toEqual([
      ['http://api/ai/analyze/workout/workout%2F1', 'POST'],
      ['http://api/ai/explain/wod/back%20squat%2F1', 'POST'],
      ['http://api/ai/explain/movement/back%20squat%2F1', 'POST'],
    ]);
  });

  it('propaga el consentimiento faltante como ApiError', async () => {
    const client = createApiClient({
      baseUrl: 'http://api',
      fetch: vi
        .fn()
        .mockResolvedValue(
          response({ code: 'AI_CONSENT_REQUIRED', message: 'Falta consentimiento' }, 403),
        ),
    });

    await expect(client.ai.analyzeProgress()).rejects.toMatchObject({
      status: 403,
      code: 'AI_CONSENT_REQUIRED',
    });
  });

  it('devuelve sin transformar el análisis y la evidencia de sus observaciones', async () => {
    const analysis = {
      cached: true,
      observations: [
        {
          evidence: [{ label: 'Volumen semanal', value: '12000 kg' }],
        },
      ],
    };
    const client = createApiClient({
      baseUrl: 'http://api',
      fetch: vi.fn().mockResolvedValue(response(analysis)),
    });

    const result = await client.ai.analyzeProgress();

    expect(result.cached).toBe(true);
    expect(result.observations[0]?.evidence).toEqual([
      { label: 'Volumen semanal', value: '12000 kg' },
    ]);
  });
});

describe('historial de análisis y rendimiento por WOD', () => {
  it('lista el historial con filtros en la consulta', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ items: [], page: 2, limit: 5, total: 0 }));
    const client = createApiClient({ baseUrl: 'http://api', fetch });

    await client.ai.analyses.list({ type: 'WOD_EXPLANATION', page: 2, limit: 5 });

    expect(fetch.mock.calls[0]?.[0]).toBe(
      'http://api/ai/analyses?type=WOD_EXPLANATION&page=2&limit=5',
    );
  });

  it('abre un análisis guardado por su identificador', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ id: 'abc', cached: true }));
    const client = createApiClient({ baseUrl: 'http://api', fetch });

    const analysis = await client.ai.analyses.get('abc');

    expect(fetch.mock.calls[0]?.[0]).toBe('http://api/ai/analyses/abc');
    expect(analysis.cached).toBe(true);
  });

  it('borra una entrada y el historial completo con DELETE', async () => {
    const fetch = vi.fn().mockResolvedValue(response(undefined, 204));
    const client = createApiClient({ baseUrl: 'http://api', fetch });

    await client.ai.analyses.remove('abc');
    await client.ai.analyses.removeAll();

    expect(fetch.mock.calls[0]?.[0]).toBe('http://api/ai/analyses/abc');
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' });
    expect(fetch.mock.calls[1]?.[0]).toBe('http://api/ai/analyses');
  });

  it('consulta el rendimiento de un WOD codificando el slug', async () => {
    const performance = { wod: { slug: 'fran' }, performance: { attempts: 2 } };
    const fetch = vi.fn().mockResolvedValue(response(performance));
    const client = createApiClient({ baseUrl: 'http://api', fetch });

    const result = await client.wods.performance('fran/1');

    expect(fetch.mock.calls[0]?.[0]).toBe('http://api/wods/fran%2F1/performance');
    expect(result.performance.attempts).toBe(2);
  });
});
