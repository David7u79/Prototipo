import { createReadStream } from 'node:fs';
import { copyFile, mkdir, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { InvalidStorageKeyError, ReleaseStorage } from './release-storage.js';

/** Segmentos permitidos en una clave: letras, dígitos, punto, guion y guion bajo. */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * `storage/releases` en la raíz del monorepo. Este fichero vive a la misma profundidad en
 * `src/` y en `dist/` (apps/api/{src,dist}/releases/storage), así que funciona en ambos.
 */
export function defaultReleasesRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../../../storage/releases');
}

/** Guarda los binarios en disco bajo un directorio raíz, sin permitir salir de él. */
export class LocalReleaseStorage extends ReleaseStorage {
  private readonly root: string;

  constructor(root: string) {
    super();
    this.root = resolve(root);
  }

  async save(key: string, sourcePath: string): Promise<void> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });
    await this.assertInsideRoot(dirname(target), key, { allowRoot: true });
    await copyFile(sourcePath, target);
  }

  async openRead(key: string): Promise<Readable> {
    const target = this.resolveKey(key);
    await this.assertInsideRoot(target, key);
    return createReadStream(target);
  }

  async size(key: string): Promise<number | null> {
    const target = this.resolveKey(key);
    try {
      await this.assertInsideRoot(target, key);
      return (await stat(target)).size;
    } catch (error) {
      if (error instanceof InvalidStorageKeyError) throw error;
      return null;
    }
  }

  /**
   * Primera defensa, puramente sintáctica: la clave debe ser relativa, con `/` como separador
   * y cada segmento en una lista blanca de caracteres (excluye `..`, `\`, `%`, bytes nulos).
   * Después se comprueba que la ruta resuelta sigue dentro de la raíz.
   */
  private resolveKey(key: string): string {
    const segments = key.split('/');
    const valid =
      key.length > 0 &&
      !isAbsolute(key) &&
      segments.every(
        (segment) => SAFE_SEGMENT.test(segment) && segment !== '.' && segment !== '..',
      );
    if (!valid) throw new InvalidStorageKeyError(key);

    const target = resolve(this.root, ...segments);
    if (!isInside(this.root, target)) throw new InvalidStorageKeyError(key);
    return target;
  }

  /** Segunda defensa: resuelve enlaces simbólicos y vuelve a comprobar la contención. */
  private async assertInsideRoot(
    path: string,
    key: string,
    options: { allowRoot?: boolean } = {},
  ): Promise<void> {
    const [realRoot, realPath] = await Promise.all([realpath(this.root), realpath(path)]);
    if (!isInside(realRoot, realPath, options.allowRoot)) throw new InvalidStorageKeyError(key);
  }
}

function isInside(root: string, target: string, allowRoot = false): boolean {
  const rel = relative(root, target);
  if (rel === '') return allowRoot;
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
