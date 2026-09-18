// Calcula los datos de presentacion desde los artefactos y fuentes del repositorio para que las
// cifras del RC no dependan de una actualizacion manual de la documentacion academica.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ignored = new Set(['.git', 'node_modules', 'dist', '.next', '.expo', 'coverage', 'typedoc']);
const testFiles = files(root).filter(isTestFile);
const testStats = testFiles.reduce((stats, file) => {
  const packageName = packageFor(file);
  const count = matches(readText(file), /\b(?:it|test)\s*\(/g);
  stats.set(packageName, (stats.get(packageName) ?? 0) + count);
  return stats;
}, new Map());
const schema = readText(join(root, 'apps/api/prisma/schema.prisma'));
const openApi = JSON.parse(readText(join(root, 'docs/generated/openapi/openapi.json')));
const catalog = JSON.parse(readText(join(root, 'packages/movements/data/catalog.json')));
const applications = directories(join(root, 'apps'));
const packages = directories(join(root, 'packages'));
// La cifra que se cita en la presentación es la que informó el ejecutor de pruebas
// (`pnpm test:counts`); contar `it(` sobreestima y sólo sirve como aproximación si ese
// artefacto todavía no existe.
const countsFile = join(root, 'docs/generated/test-counts.json');
const executed = existsSync(countsFile) ? JSON.parse(readText(countsFile)) : null;
const testRows = executed
  ? [
      ['Pruebas ejecutadas', String(executed.total), 'Resultado de `pnpm test` (pnpm test:counts)'],
      ...Object.entries(executed.packages).map(([name, value]) => [
        `Pruebas: ${name}`, String(value.passed), 'Resultado de `pnpm test` para ese paquete',
      ]),
    ]
  : [
      ['Pruebas (aproximado)', String([...testStats.values()].reduce((total, value) => total + value, 0)),
        'Conteo de it( y test(; ejecuta `pnpm test:counts` para la cifra real'],
      ...[...testStats.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => [
        `Pruebas: ${name}`, String(count), 'Conteo de it( y test( en sus ficheros de prueba',
      ]),
    ];
const rows = [
  ...testRows,
  ['Ficheros de prueba', String(testFiles.length), 'Patrones *.test.* y *.spec.*'],
  ['Recorridos E2E', String(files(join(root, 'apps/web/e2e')).filter(isTestFile).length), 'Ficheros E2E'],
  ['Rutas OpenAPI', String(Object.keys(openApi.paths ?? {}).length), 'paths de openapi.json'],
  ['Modelos Prisma', String(matches(schema, /^model\s+\w+/gm)), 'schema.prisma'],
  ['Enums Prisma', String(matches(schema, /^enum\s+\w+/gm)), 'schema.prisma'],
  ['Movimientos del catalogo', String(Array.isArray(catalog) ? catalog.length : catalog.movements?.length ?? 0),
    'packages/movements/data/catalog.json'],
  ['Aplicaciones', String(applications.length), 'Directorios de apps/'],
  ['Paquetes', String(packages.length), 'Directorios de packages/'],
  ['ADRs', String(files(join(root, 'docs/adr')).filter((file) => extname(file) === '.md').length), 'docs/adr'],
  ['Diagramas Mermaid', String(files(join(root, 'docs')).filter((file) => extname(file) === '.md')
    .reduce((total, file) => total + matches(readText(file), /```mermaid/g), 0)),
    'Bloques Mermaid en docs/'],
  ['Capturas por fase', captureSummary(), 'Ficheros en docs/evidence/*/capturas'],
  ['Version del release', JSON.parse(readText(join(root, 'package.json'))).version, 'package.json raiz'],
];
const document = [
  '# Hechos para la presentacion', '',
  'Se genera con `pnpm docs:facts`; no editar manualmente.',
  `Fecha de generacion: ${new Date().toISOString()}`, '',
  '| Dato | Valor | Como se obtuvo |',
  '| --- | ---: | --- |',
  ...rows.map((row) => `| ${row.join(' | ')} |`),
  '',
].join('\n');

mkdirSync(join(root, 'docs/demo'), { recursive: true });
writeFileSync(join(root, 'docs/demo/FACTS.md'), document);
console.log('OK: docs/demo/FACTS.md generado.');

function files(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : files(file);
    return entry.isFile() ? [file] : [];
  });
}

function directories(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignored.has(entry.name))
    .map((entry) => entry.name);
}

function isTestFile(file) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file.replaceAll('\\', '/'));
}

function packageFor(file) {
  const parts = relative(root, file).replaceAll('\\', '/').split('/');
  return parts.length > 1 ? `${parts[0]}/${parts[1]}` : 'raiz';
}

function readText(file) {
  return readFileSync(file, 'utf8');
}

function matches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function captureSummary() {
  const evidence = join(root, 'docs/evidence');
  return directories(evidence).map((phase) => {
    const captures = files(join(evidence, phase, 'capturas')).length;
    return `${phase}: ${captures}`;
  }).join(', ');
}
