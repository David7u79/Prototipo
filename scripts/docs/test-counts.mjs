// Ejecuta la batería de pruebas y guarda cuántas pasaron por paquete. Contar `it(` en el código
// sobreestima (hay declaraciones dentro de bucles, comentarios o cadenas), así que la cifra que se
// cita en la documentación sale de lo que informó el propio ejecutor.
//
//   node scripts/docs/test-counts.mjs   →  docs/generated/test-counts.json
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const isWindows = process.platform === 'win32';

console.log('Ejecutando la batería de pruebas para contar los resultados…');
let output = '';
try {
  output = execFileSync(
    isWindows ? 'cmd.exe' : 'pnpm',
    isWindows ? ['/d', '/s', '/c', 'pnpm', 'test'] : ['test'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
} catch (error) {
  // Con pruebas en rojo interesa igualmente lo que alcanzó a informar, pero no se escribe nada.
  console.error('La batería de pruebas falló; no se actualiza el conteo.');
  console.error(String(error.stdout ?? '').split('\n').filter((line) => line.includes('Tests')).join('\n'));
  process.exit(1);
}

// Turbo antepone el paquete a cada línea: `@garfit/api:test:       Tests  131 passed (131)`.
const byPackage = {};
for (const line of output.split(/\r?\n/)) {
  const match = line.match(/^(@garfit\/[\w-]+):test:\s+Tests\s+(\d+) passed \((\d+)\)/);
  if (!match) continue;
  const [, name, passed, total] = match;
  byPackage[name] = { passed: Number(passed), total: Number(total) };
}

if (Object.keys(byPackage).length === 0) {
  console.error('No se reconoció ninguna línea de resultados; revisa el formato del ejecutor.');
  process.exit(1);
}

const total = Object.values(byPackage).reduce((sum, item) => sum + item.passed, 0);
const content = {
  generatedAt: new Date().toISOString(),
  total,
  packages: Object.fromEntries(Object.entries(byPackage).sort(([a], [b]) => a.localeCompare(b))),
};

mkdirSync(join(root, 'docs/generated'), { recursive: true });
writeFileSync(join(root, 'docs/generated/test-counts.json'), `${JSON.stringify(content, null, 2)}\n`);
console.log(`Conteo guardado: ${total} pruebas en ${Object.keys(byPackage).length} paquetes`);
