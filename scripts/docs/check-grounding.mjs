// Comprueba que la documentación no inventa identificadores del modelo ni del código:
// cada atributo de un erDiagram debe existir en schema.prisma y cada identificador
// camelCase/PascalCase entre comillas invertidas debe aparecer en el código del repo.
// Uso (desde la raíz): node scripts/docs/check-grounding.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const schema = readFileSync('apps/api/prisma/schema.prisma', 'utf8');

function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'generated', '.next', '.expo'].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collect(path, out);
    else if (/\.(ts|tsx|prisma|mjs|json)$/.test(name)) out.push(readFileSync(path, 'utf8'));
  }
  return out;
}
const sources = [
  'packages',
  'apps/api/src',
  'apps/api/test',
  'apps/web/src',
  'apps/web/e2e',
  'apps/mobile/src',
  'scripts',
];
const code = [schema, readFileSync('package.json', 'utf8'), ...sources.flatMap((dir) => collect(dir))].join(
  '\n',
);

const docs = [
  'docs/academic/05-requerimientos.md',
  'docs/academic/06-diseno-del-sistema.md',
  'docs/academic/07-modelo-de-datos.md',
  'docs/academic/08-implementacion.md',
  'docs/academic/09-pruebas-y-verificacion.md',
  'docs/academic/11-manual-de-operacion.md',
  'docs/architecture/athlete-domain.md',
];

const problems = [];
for (const doc of docs) {
  const text = readFileSync(doc, 'utf8');
  // Atributos de erDiagram: "    Tipo nombre ..." dentro de bloques { }.
  for (const block of text.matchAll(/erDiagram([\s\S]*?)```/g)) {
    for (const line of block[1].split('\n')) {
      const attr = line.match(/^\s+[\w[\]]+\s+([a-z]\w*)\b/);
      if (attr && !schema.includes(attr[1])) problems.push(`${doc}: atributo ER inexistente "${attr[1]}"`);
    }
  }
  // Identificadores camelCase o PascalCase entre comillas invertidas.
  for (const match of text.matchAll(/`([A-Za-z][A-Za-z0-9]*(?:[A-Z][a-z0-9]+)+)`/g)) {
    if (!code.includes(match[1])) problems.push(`${doc}: identificador inexistente \`${match[1]}\``);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('OK: sin identificadores inventados');
