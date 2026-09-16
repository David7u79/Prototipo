import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './index.js';

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
      baseUrl: 'http://api', fetch: vi.fn().mockResolvedValue(response({ message: 'no' }, 404)),
    });
    await expect(missing.releases.latestAndroid()).resolves.toBeNull();
    const failed = createApiClient({
      baseUrl: 'http://api', fetch: vi.fn().mockResolvedValue(response({ message: 'no' }, 500)),
    });
    await expect(failed.releases.latestAndroid()).rejects.toBeInstanceOf(ApiError);
  });
});
