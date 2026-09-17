import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const document = JSON.parse(
  readFileSync(resolve(root, 'docs/generated/openapi/openapi.json'), 'utf8'),
);
const failures = [];

for (const [route, path] of Object.entries(document.paths)) {
  for (const [method, operation] of Object.entries(path)) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
    for (const [code, response] of Object.entries(operation.responses ?? {})) {
      if (!/^2\d\d$/.test(code) || code === '204') continue;
      const content = response.content;
      const schemas = Object.values(content ?? {}).map((mediaType) => mediaType.schema);
      const valid = schemas.some((schema) => {
        if (!schema) return false;
        return (
          schema.$ref || schema.type !== 'object' || Object.keys(schema.properties ?? {}).length > 0
        );
      });
      if (!content || !valid) failures.push(`${method.toUpperCase()} ${route} ${code}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('OK: todas las respuestas 2xx tienen schema');
