import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './app.js';

describe('GET /health', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('responde ok con la base de datos disponible', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/health').expect(200);
    // La versión sale del package.json de la API, que sincroniza `pnpm version:sync` desde la
    // raíz: fijarla aquí obligaría a tocar el test en cada release.
    const { version } = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    );
    expect(res.body).toMatchObject({ status: 'ok', database: 'up', version });
    expect(Date.parse(res.body.timestamp)).not.toBeNaN();
  });
});
