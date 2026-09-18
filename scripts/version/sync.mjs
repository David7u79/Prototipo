// Propaga la versión de GarFit desde el package.json raíz (fuente única) a las aplicaciones y a
// la configuración de Expo. Con `--check` no escribe: falla si algo quedó desincronizado, que es
// lo que comprueban `pnpm version:check` y `pnpm release:check`.
//
//   node scripts/version/sync.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const check = process.argv.includes('--check');

const rootPackage = readJson('package.json');
const version = rootPackage.version;
const androidVersionCode = rootPackage.garfit?.androidVersionCode;

if (typeof version !== 'string' || version.trim() === '') {
  fail('package.json raíz no define "version"');
}
if (!Number.isInteger(androidVersionCode) || androidVersionCode <= 0) {
  fail('package.json raíz no define "garfit.androidVersionCode" como entero positivo');
}

/** Paquetes publicables cuya versión debe coincidir con la del producto. */
const packages = [
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/landing/package.json',
  'apps/mobile/package.json',
];

const problems = [];

for (const file of packages) {
  const pkg = readJson(file);
  if (pkg.version === version) continue;
  if (check) {
    problems.push(`${file}: ${pkg.version} (esperado ${version})`);
    continue;
  }
  pkg.version = version;
  writeJson(file, pkg);
}

const appConfigFile = 'apps/mobile/app.json';
const appConfig = readJson(appConfigFile);
const expo = appConfig.expo;
if (expo.version !== version || expo.android.versionCode !== androidVersionCode) {
  if (check) {
    problems.push(
      `${appConfigFile}: ${expo.version} (versionCode ${expo.android.versionCode}); ` +
        `esperado ${version} (versionCode ${androidVersionCode})`,
    );
  } else {
    expo.version = version;
    expo.android.versionCode = androidVersionCode;
    writeJson(appConfigFile, appConfig);
  }
}

if (problems.length) {
  console.error('Versiones desincronizadas:');
  console.error(problems.map((problem) => `  - ${problem}`).join('\n'));
  console.error('Ejecuta `pnpm version:sync` para corregirlo.');
  process.exit(1);
}

console.log(
  check
    ? `OK: todo el monorepo declara la versión ${version} (versionCode ${androidVersionCode})`
    : `Versión ${version} (versionCode ${androidVersionCode}) propagada a ${packages.length} paquetes y a app.json`,
);

function readJson(file) {
  return JSON.parse(readFileSync(join(root, file), 'utf8'));
}

function writeJson(file, value) {
  writeFileSync(join(root, file), `${JSON.stringify(value, null, 2)}\n`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
