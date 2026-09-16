import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalReleaseStorage } from './local-release-storage.js';
import { InvalidStorageKeyError } from './release-storage.js';

const roots: string[] = [];
const canCreateSymlink = (() => {
  const root = mkdtempSync(join(tmpdir(), 'garfit-link-root-'));
  const outside = mkdtempSync(join(tmpdir(), 'garfit-link-outside-'));
  try {
    symlinkSync(outside, join(root, 'link'), 'junction');
    return true;
  } catch {
    return false;
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
})();
async function directory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'garfit-storage-'));
  roots.push(root);
  return root;
}
async function bytes(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

afterEach(async () =>
  Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))),
);

describe('LocalReleaseStorage', () => {
  it('rechaza claves peligrosas', async () => {
    const storage = new LocalReleaseStorage(await directory());
    for (const key of [
      '',
      '../x',
      'android/../../x',
      '/etc/passwd',
      'C:\\Windows\\x',
      'a\\..\\b',
      'android/%2e%2e/x',
      'a\0b',
      'android//x',
      './x',
    ]) {
      await expect(storage.size(key)).rejects.toBeInstanceOf(InvalidStorageKeyError);
    }
  });
  it('guarda, mide y lee una clave anidada', async () => {
    const root = await directory();
    const source = join(root, 'source.apk');
    await writeFile(source, Buffer.from('apk bytes'));
    const storage = new LocalReleaseStorage(root);
    await storage.save('android/nested/app.apk', source);
    expect(await storage.size('android/nested/app.apk')).toBe(9);
    expect(await bytes(await storage.openRead('android/nested/app.apk'))).toEqual(
      Buffer.from('apk bytes'),
    );
    expect(await storage.size('android/missing.apk')).toBeNull();
  });
  it.skipIf(!canCreateSymlink)('rechaza enlaces simbólicos que salen de la raíz', async () => {
    const root = await directory();
    const outside = await directory();
    await writeFile(join(outside, 'secret.apk'), 'secret');
    await symlink(outside, join(root, 'android'), 'junction');
    const storage = new LocalReleaseStorage(root);
    await expect(storage.openRead('android/secret.apk')).rejects.toBeInstanceOf(
      InvalidStorageKeyError,
    );
  });
});
