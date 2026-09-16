import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ReleasePlatform } from '../src/generated/prisma/enums.js';
import { LocalReleaseStorage } from '../src/releases/storage/local-release-storage.js';
import { ReleaseStorage } from '../src/releases/storage/release-storage.js';
import { createTestApp, resetDatabase, type TestApp } from './app.js';

describe('releases Android', () => {
  let ctx: TestApp;
  let root: string;
  let storage: LocalReleaseStorage;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'garfit-releases-'));
    storage = new LocalReleaseStorage(root);
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(ReleaseStorage).useValue(storage),
    );
  });
  beforeEach(async () => resetDatabase(ctx.prisma));
  afterAll(async () => {
    await ctx.app.close();
    await rm(root, { recursive: true, force: true });
  });

  async function release(
    options: Partial<{ version: string; code: number; published: boolean; path: string }> = {},
  ) {
    const version = options.version ?? '1.0.0';
    const path = options.path ?? `android/garfit-${version}.apk`;
    const bytes = Buffer.from(`apk-${version}`);
    const source = join(root, `source-${version}.apk`);
    await writeFile(source, bytes);
    if (options.path === undefined) await storage.save(path, source);
    return ctx.prisma.appRelease.create({
      data: {
        platform: ReleasePlatform.ANDROID,
        version,
        versionCode: options.code ?? 1,
        fileName: `garfit-${version}.apk`,
        filePath: path,
        fileSize: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        changelog: ['Cambio'],
        published: options.published ?? true,
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
  }

  it('informa cuando no hay releases o sólo hay borradores', async () => {
    expect((await request(ctx.app.getHttpServer()).get('/releases/latest/android')).body.code).toBe(
      'NO_RELEASE_PUBLISHED',
    );
    await release({ published: false });
    expect((await request(ctx.app.getHttpServer()).get('/releases/latest/android')).body.code).toBe(
      'NO_RELEASE_PUBLISHED',
    );
  });
  it('devuelve la publicada con mayor versionCode en la forma pública', async () => {
    await release({ version: '1.0.0', code: 1 });
    const newest = await release({ version: '2.0.0', code: 2 });
    const response = await request(ctx.app.getHttpServer())
      .get('/releases/latest/android')
      .expect(200);
    expect(response.body).toEqual({
      platform: 'android',
      version: '2.0.0',
      versionCode: 2,
      releasedAt: newest.publishedAt?.toISOString(),
      size: newest.fileSize,
      downloadUrl: 'http://api.test/releases/android/2.0.0/download',
      sha256: newest.sha256,
      changelog: ['Cambio'],
    });
  });
  it('descarga el APK publicado con cabeceras y bytes correctos', async () => {
    const item = await release();
    const response = await request(ctx.app.getHttpServer())
      .get('/releases/android/1.0.0/download')
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(response.headers['content-type']).toContain('application/vnd.android.package-archive');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['x-checksum-sha256']).toBe(item.sha256);
    expect(response.body).toEqual(Buffer.from('apk-1.0.0'));
  });
  it('valida la versión y oculta inexistentes, borradores y archivos ausentes', async () => {
    for (const version of ['1.0', '..%2F..%2Fetc']) {
      expect(
        (await request(ctx.app.getHttpServer()).get(`/releases/android/${version}/download`)).body
          .code,
      ).toBe('VALIDATION_FAILED');
    }
    expect(
      (await request(ctx.app.getHttpServer()).get('/releases/android/9.0.0/download')).body.code,
    ).toBe('RELEASE_NOT_FOUND');
    await release({ version: '2.0.0', published: false });
    await release({ version: '3.0.0', code: 3, path: 'android/missing.apk' });
    for (const version of ['2.0.0', '3.0.0']) {
      expect(
        (await request(ctx.app.getHttpServer()).get(`/releases/android/${version}/download`)).body
          .code,
      ).toBe('RELEASE_NOT_FOUND');
    }
  });
  it('no sirve una ruta maliciosa almacenada en la base de datos', async () => {
    await release({ path: '../../secret.txt' });
    const response = await request(ctx.app.getHttpServer()).get('/releases/android/1.0.0/download');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('RELEASE_NOT_FOUND');
  });
});
