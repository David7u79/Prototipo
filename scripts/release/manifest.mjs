// Construye el manifiesto de un APK real para vincular el RC con un artefacto verificable.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultApk = 'apps/mobile/android/app/build/outputs/apk/release/app-release.apk';
const argument = process.argv.indexOf('--apk');

if (argument >= 0 && !process.argv[argument + 1]) fail('falta la ruta despues de --apk');

const apkPath = resolve(root, argument >= 0 ? process.argv[argument + 1] : defaultApk);
if (!existsSync(apkPath)) fail(`no existe el APK: ${apkPath}`);

const product = readJson('package.json');
const android = readJson('apps/mobile/app.json').expo.android;
const content = readFileSync(apkPath);
const manifest = {
  name: product.name,
  version: product.version,
  versionCode: product.garfit.androidVersionCode,
  packageId: android.package,
  sha256: createHash('sha256').update(content).digest('hex'),
  size: statSync(apkPath).size,
  commit: gitCommit(),
  builtAt: new Date().toISOString(),
};

writeFileSync(
  resolve(root, 'docs/generated/release-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log('Manifiesto generado: docs/generated/release-manifest.json');

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), 'utf8'));
}

function gitCommit() {
  try {
    const safe = `safe.directory=${root.replaceAll('\\', '/')}`;
    return execFileSync('git', ['-c', safe, 'rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'PENDIENTE';
  }
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
