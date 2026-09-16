/**
 * Exporta la especificación OpenAPI a docs/generated/openapi/ sin abrir puerto ni consultar la
 * base de datos. Uso: `pnpm --filter @garfit/api openapi:export` (compila antes).
 */
import { NestFactory } from '@nestjs/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

// La exportación sólo lee metadatos de rutas: si no hay .env (p. ej. en CI) se usan valores
// ficticios que nunca se usan para conectar ni firmar nada.
process.env.DATABASE_URL ??= 'postgresql://openapi:openapi@localhost:5432/openapi';
process.env.JWT_ACCESS_SECRET ??= 'openapi-export-placeholder-secret-never-used';

const { AppModule } = await import('../app.module.js');
const { createOpenApiDocument, setupApp } = await import('../common/setup-app.js');

const app = await NestFactory.create(AppModule, { logger: ['error'] });
setupApp(app);
const document = createOpenApiDocument(app);
await app.close();

// dist/cli → raíz del monorepo.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const outputDir = resolve(repoRoot, 'docs/generated/openapi');
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'openapi.json'), `${JSON.stringify(document, null, 2)}\n`);
await writeFile(resolve(outputDir, 'openapi.yaml'), stringify(document));
console.log(`OpenAPI exportado en ${outputDir}`);
