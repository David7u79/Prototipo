// Verifica que el release candidate es consistente antes de publicarlo, sin subir ni modificar
// nada. --fast omite pruebas y build para una comprobacion rapida durante el desarrollo.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fast = process.argv.includes('--fast');
const execFileAsync = promisify(execFile);
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Uso: pnpm release:check [--fast]');
  console.log('--fast omite test y build; el resto de comprobaciones se mantiene.');
  process.exit(0);
}

const checks = [
  ['Arbol de trabajo limpio', () => git(['status', '--porcelain'], true)],
  ['Versiones sincronizadas', () => command(process.execPath, ['scripts/version/sync.mjs', '--check'])],
  ['Lint', () => pnpm(['lint'])],
  ['Typecheck', () => pnpm(['typecheck'])],
  ['Tests', () => fast ? skip() : pnpm(['test'])],
  ['Build', () => fast ? skip() : pnpm(['build'])],
  ['Documentacion', () => pnpm(['docs:check'])],
  ['OpenAPI', () => pnpm(['docs:check-openapi'])],
  ['Artefactos', checkArtifacts],
  ['Secretos', () => command(process.execPath, ['scripts/security/secret-scan.mjs'])],
];
const results = [];
results.push(...await runGroup(checks.slice(0, 4)));
results.push(...await runGroup(checks.slice(4, 6)));
results.push({ name: checks[6][0], ...await checks[6][1]() });
results.push({ name: checks[7][0], ...await checks[7][1]() });
results.push(...await runGroup(checks.slice(8)));

console.log('| Comprobacion | Resultado |');
console.log('| --- | --- |');
for (const result of results) console.log(`| ${result.name} | ${result.message} |`);
if (results.some((result) => !result.ok && !result.skipped)) process.exitCode = 1;

async function runGroup(group) {
  return Promise.all(group.map(async ([name, run]) => ({ name, ...await run() })));
}

async function command(bin, args, expectEmpty = false) {
  try {
    const { stdout } = await execFileAsync(bin, args, { cwd: root, encoding: 'utf8' });
    const output = stdout.trim();
    if (expectEmpty && output) return fail('hay cambios sin commit');
    return ok();
  } catch (error) {
    return fail(outputOf(error) || 'el comando termino con error');
  }
}

function pnpm(args) {
  return process.platform === 'win32'
    ? command('cmd.exe', ['/d', '/s', '/c', 'pnpm', ...args])
    : command('pnpm', args);
}

function git(args, expectEmpty = false) {
  const safe = `safe.directory=${root.replaceAll('\\', '/')}`;
  return command('git', ['-c', safe, ...args], expectEmpty);
}

function checkArtifacts() {
  const required = [
    'docs/generated/openapi/openapi.json',
    'docs/generated/database/erd.svg',
  ];
  const missing = required.filter((file) => !existsSync(join(root, file)));
  if (missing.length) return fail(`faltan ${missing.join(', ')}`);
  try {
    JSON.parse(readFileSync(join(root, required[0]), 'utf8'));
  } catch {
    return fail('openapi.json no es JSON valido');
  }
  const manifestFile = join(root, 'docs/generated/release-manifest.json');
  if (existsSync(manifestFile)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
      const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
      if (manifest.version !== version) return fail('la version del manifiesto no coincide');
    } catch {
      return fail('release-manifest.json no es valido');
    }
  }
  return ok();
}

function ok() {
  return { ok: true, skipped: false, message: 'OK' };
}

function skip() {
  return { ok: true, skipped: true, message: 'OMITIDO (--fast)' };
}

function fail(message) {
  return { ok: false, skipped: false, message: `FALLO: ${message.replaceAll('|', '/')}` };
}

function outputOf(error) {
  return `${error.stdout ?? ''}${error.stderr ?? ''}`.trim().split(/\r?\n/).at(-1);
}
