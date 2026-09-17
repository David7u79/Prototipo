// Regenera data/catalog.json desde la fuente fijada en src/source-transform.ts.
// Uso (desde la raíz): pnpm --filter @garfit/movements catalog:import
// Requiere red. El resultado se versiona; la semilla de la API lee ese fichero, no la red.
import { writeFile } from 'node:fs/promises';
import { SOURCE, SOURCE_URL, transformSource } from '../dist/index.js';

const OUTPUT = new URL('../data/catalog.json', import.meta.url);

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`No se pudo descargar ${SOURCE_URL}: HTTP ${response.status}`);
}
const exercises = await response.json();
const movements = transformSource(exercises);

const catalog = {
  source: { ...SOURCE, url: SOURCE_URL, exercises: exercises.length },
  movements,
};
await writeFile(OUTPUT, `${JSON.stringify(catalog, null, 1)}\n`);
console.log(
  `${movements.length} movimientos escritos en data/catalog.json ` +
    `(${exercises.length - movements.length} variantes de cámara descartadas)`,
);
