// Genera evidencia documental del release candidate para facilitar una revision reproducible.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const isWindows = process.platform === 'win32';
const pnpm = isWindows ? 'cmd.exe' : 'pnpm';
const check = process.argv.includes('--check');
const failures = [];

function pnpmArgs(args) {
  return isWindows ? ['/d', '/s', '/c', 'pnpm', ...args] : args;
}
function run(label, command, args, cwd = root) {
  console.log(`Documentación: ${label}`);
  try {
    execFileSync(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
    });
  } catch {
    failures.push(label);
  }
}

function git(args, fallback = 'PENDIENTE') {
  try {
    const safe = `safe.directory=${root.replaceAll('\\', '/')}`;
    return execFileSync('git', ['-c', safe, ...args], { cwd: root, encoding: 'utf8' }).trim()
      || fallback;
  } catch {
    return fallback;
  }
}

function packageInfo(directory) {
  const file = join(root, directory, 'package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  return `${pkg.name}@${pkg.version ?? '0.0.0'}`;
}

function coverageValue(summary, key) {
  const total = summary?.total?.[key];
  return total ? `${total.pct}%` : '—';
}

function writeCoverage() {
  console.log('Documentación: resumen de cobertura');
  const candidates = ['apps/api', 'apps/web'];
  const packages = join(root, 'packages');
  for (const name of readdirSync(packages, { withFileTypes: true })) {
    if (name.isDirectory()) candidates.push(`packages/${name.name}`);
  }
  const rows = candidates.flatMap((dir) => {
    const file = join(root, dir, 'coverage', 'coverage-summary.json');
    if (!existsSync(file)) return [];
    const report = JSON.parse(readFileSync(file, 'utf8'));
    const values = ['lines', 'statements', 'functions', 'branches']
      .map((key) => coverageValue(report, key));
    return [`| ${dir} | ${values.join(' | ')} |`];
  });
  const message = rows.length
    ? rows.join('\n')
    : '| Sin reportes | — | — | — | — |\n\nEjecute `pnpm test:coverage` para generarlos.';
  const content = [
    '# Resumen de cobertura', '', `Generado: ${new Date().toISOString()}`, '',
    '| Paquete | Líneas | Sentencias | Funciones | Ramas |',
    '| --- | ---: | ---: | ---: | ---: |', message, '',
  ].join('\n');
  const output = join(root, 'docs/generated/coverage');
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'SUMMARY.md'), content);
}

function writeBuildInfo() {
  console.log('Documentación: BUILD_INFO');
  const schema = readFileSync(join(root, 'apps/api/prisma/schema.prisma'));
  const migrationDir = join(root, 'apps/api/prisma/migrations');
  const migrations = readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const dirty = git(['status', '--porcelain'], '') ? 'sí' : 'no';
  const pnpmVersion = process.env.npm_config_user_agent?.match(/pnpm\/(\S+)/)?.[1]
    ?? gitPnpmVersion();
  const locations = ['apps/api', 'apps/web', 'apps/mobile', 'apps/landing', 'packages/types',
    'packages/validation', 'packages/api-client', 'packages/config'];
  const versions = locations.map(packageInfo).join('\n');
  const dependencies = ['apps/web', 'apps/mobile', 'apps/landing', 'apps/api'].flatMap((dir) => {
    const pkg = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    const source = { ...pkg.dependencies, ...pkg.devDependencies };
    return ['next', 'expo', 'astro', '@nestjs/core', 'prisma']
      .filter((name) => source[name]).map((name) => `${name}: ${source[name]}`);
  });
  const schemaHash = createHash('sha256').update(schema).digest('hex').slice(0, 12);
  // Versión de la app Android: app.json es la única fuente (ADR 0010). El SHA-256 del APK no se
  // genera aquí porque depende del artefacto compilado y vive en la evidencia de la fase.
  const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const androidApp = JSON.parse(readFileSync(join(root, 'apps/mobile/app.json'), 'utf8')).expo;
  const manifestFile = join(root, 'docs/generated/release-manifest.json');
  const manifest = existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, 'utf8'))
    : null;
  const applications = ['apps/api', 'apps/web', 'apps/landing', 'apps/mobile']
    .map(packageInfo);
  const content = [
    '# Información de compilación', '', `- Fecha: ${new Date().toISOString()}`,
    `- Version de GarFit: ${rootPackage.version}`,
    `- Commit: ${git(['rev-parse', 'HEAD'])}`,
    `- Rama: ${git(['rev-parse', '--abbrev-ref', 'HEAD'])}`,
    `- Cambios sin commit: ${dirty}`, `- Node: ${process.version}`,
    `- pnpm: ${pnpmVersion}`, `- Última migración: ${migrations.at(-1) ?? 'ninguna'}`,
    `- SHA-256 corto de schema.prisma: ${schemaHash}`,
    `- Android: ${androidApp.android.package} ${androidApp.version} (versionCode ${androidApp.android.versionCode})`,
    `- SHA-256 del APK: ${manifest?.sha256 ?? 'PENDIENTE'}`,
    '',
    '## Aplicaciones', '', applications.join('\n'), '',
    '## Aplicaciones y paquetes', '', versions, '',
    '## Dependencias clave', '', [...new Set(dependencies)].join('\n'), '',
  ].join('\n');
  writeFileSync(join(root, 'docs/generated/BUILD_INFO.md'), content);
}

function gitPnpmVersion() {
  try {
    return execFileSync(pnpm, pnpmArgs(['--version']), { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'PENDIENTE';
  }
}

mkdirSync(join(root, 'docs/generated/openapi'), { recursive: true });
mkdirSync(join(root, 'docs/generated/database'), { recursive: true });
run('OpenAPI', pnpm, pnpmArgs(['--filter', '@garfit/api', 'openapi:export']));
run('ERD Prisma', pnpm, pnpmArgs(['--filter', '@garfit/api', 'prisma:generate']));
run('TypeDoc', process.execPath, [join(root, 'node_modules/typedoc/bin/typedoc')]);
if (!check) {
  writeCoverage();
  writeBuildInfo();
}
if (check) run('artefactos versionados', 'git', ['-c',
  `safe.directory=${root.replaceAll('\\', '/')}`, 'diff', '--exit-code', '--',
  'docs/generated/openapi', 'docs/generated/database']);
if (failures.length) {
  console.error(`Fallaron: ${failures.join(', ')}`);
  process.exitCode = 1;
}
