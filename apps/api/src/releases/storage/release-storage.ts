import type { Readable } from 'node:stream';

/** La clave pedida no es válida o apunta fuera del almacenamiento. */
export class InvalidStorageKeyError extends Error {
  constructor(key: string) {
    super(`Clave de almacenamiento inválida: ${JSON.stringify(key)}`);
    this.name = 'InvalidStorageKeyError';
  }
}

/**
 * Almacenamiento de binarios de releases. El dominio sólo conoce claves relativas
 * (`android/garfit-1.0.0.apk`); dónde viven los bytes (disco local, S3, R2) es asunto de la
 * implementación, que se elige en ReleasesModule.
 */
export abstract class ReleaseStorage {
  /** Copia `sourcePath` (fichero local) bajo `key`. */
  abstract save(key: string, sourcePath: string): Promise<void>;

  abstract openRead(key: string): Promise<Readable>;

  /** Tamaño en bytes, o `null` si no existe. */
  abstract size(key: string): Promise<number | null>;
}
