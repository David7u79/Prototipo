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
    expect(res.body).toMatchObject({ status: 'ok', database: 'up', version: '0.1.0' });
    expect(Date.parse(res.body.timestamp)).not.toBeNaN();
  });
});
