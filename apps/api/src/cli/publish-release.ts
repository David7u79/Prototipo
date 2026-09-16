/**
 * Publica un APK de GarFit: lo copia al almacenamiento de releases y registra AppRelease.
 * No existe endpoint HTTP de publicación: sólo quien opera el servidor puede publicar.
 *
 *   pnpm --filter @garfit/api release:publish -- \
 *     --file ./garfit.apk --version 1.0.0 --version-code 1 \
 *     --changelog "Primera versión" [--changelog "..."] [--draft]
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { SEMVER } from '../common/constants.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { ReleasePlatform } from '../generated/prisma/enums.js';
import {
  defaultReleasesRoot,
  LocalReleaseStorage,
} from '../releases/storage/local-release-storage.js';

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    version: { type: 'string' },
    'version-code': { type: 'string' },
    changelog: { type: 'string', multiple: true, default: [] },
    draft: { type: 'boolean', default: false },
  },
});

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const file = values.file ? resolve(values.file) : fail('--file es obligatorio');
const version = values.version ?? fail('--version es obligatorio');
const versionCode = Number(values['version-code']);
if (!SEMVER.test(version)) fail(`"${version}" no es SemVer válido`);
if (!Number.isInteger(versionCode) || versionCode <= 0) fail('--version-code debe ser > 0');
if (extname(file).toLowerCase() !== '.apk') fail('el fichero debe tener extensión .apk');

const fileInfo = await stat(file).catch(() => fail(`no existe ${file}`));
if (!fileInfo.isFile()) fail(`${file} no es un fichero`);

const databaseUrl = process.env.DATABASE_URL ?? fail('DATABASE_URL no está definida');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

try {
  const latest = await prisma.appRelease.findFirst({
    where: { platform: ReleasePlatform.ANDROID },
    orderBy: { versionCode: 'desc' },
  });
  if (latest && versionCode <= latest.versionCode) {
    fail(`versionCode debe ser mayor que ${latest.versionCode} (${latest.version})`);
  }

  const sha256 = await sha256Of(file);
  const key = `android/garfit-${version}.apk`;
  const storage = new LocalReleaseStorage(
    process.env.RELEASES_STORAGE_DIR?.trim() || defaultReleasesRoot(),
  );
  await storage.save(key, file);

  const release = await prisma.appRelease.create({
    data: {
      platform: ReleasePlatform.ANDROID,
      version,
      versionCode,
      fileName: basename(key),
      filePath: key,
      fileSize: fileInfo.size,
      sha256,
      changelog: values.changelog,
      published: !values.draft,
      publishedAt: values.draft ? null : new Date(),
    },
  });
  const state = release.published ? 'publicada' : 'borrador';
  console.log(`Release ${release.version} (${release.versionCode}) ${state}. SHA-256 ${sha256}`);
} finally {
  await prisma.$disconnect();
}

function sha256Of(path: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolvePromise(hash.digest('hex')));
  });
}
