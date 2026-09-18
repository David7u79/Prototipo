// Examina textos del arbol de trabajo para impedir que credenciales lleguen al release candidate.
// Solo informa ubicacion y linea: nunca imprime el valor encontrado.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const excluded = new Set(['.git', 'node_modules', 'dist', '.next', '.expo', 'storage', 'coverage']);
const excludedPaths = new Set(['apps/mobile/android']);
const binaries = new Set([
  '.apk', '.avif', '.class', '.dll', '.exe', '.gif', '.ico', '.jar', '.jpeg', '.jpg', '.lock',
  '.mp3', '.mp4', '.pdf', '.png', '.svg', '.ttf', '.wasm', '.webp', '.woff', '.woff2', '.zip',
]);
const patterns = [
  ['clave Google/Gemini', /AIza[0-9A-Za-z_-]{20,}/],
  ['token GitHub', /gh(?:p|o)_[0-9A-Za-z]{20,}/],
  ['Authorization Bearer', /Authorization\s*:\s*Bearer\s+[^\s'"`<>]+/i],
  ['JWT', /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/],
  ['clave privada', /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/],
  ['contrasena de keystore', /(?:storePassword|keyPassword)\s*[=:]\s*(?!android\b)[^\s'"`]+/i],
];
const findings = [];

scanDirectory(root);
for (const finding of findings) console.error(`${finding.file}:${finding.line} ${finding.kind}`);
if (findings.length) {
  console.error(`Se detectaron ${findings.length} posible(s) secreto(s).`);
  process.exitCode = 1;
} else {
  console.log('OK: no se detectaron secretos.');
}

function scanDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    const repoPath = relative(root, file).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (!excluded.has(entry.name) && !excludedPaths.has(repoPath)) scanDirectory(file);
      continue;
    }
    if (!entry.isFile() || entry.name.endsWith('.env.example') || binaries.has(extname(entry.name))) {
      continue;
    }
    scanFile(file, repoPath);
  }
}

function scanFile(file, repoPath) {
  let content;
  try {
    content = readFileSync(file);
  } catch {
    return;
  }
  if (content.includes(0)) return;
  for (const [index, line] of content.toString('utf8').split(/\r?\n/).entries()) {
    for (const [kind, pattern] of patterns) {
      if (pattern.test(line)) findings.push({ file: repoPath, line: index + 1, kind });
    }
    if (hasSecretAssignment(line, repoPath)) {
      findings.push({ file: repoPath, line: index + 1, kind: 'variable secreta' });
    }
  }
}

function hasSecretAssignment(line, repoPath) {
  if (repoPath === 'README.md' || repoPath.startsWith('docs/')) return false;
  const match = line.match(/^(?:export\s+)?(?:GEMINI_API_KEY|JWT_ACCESS_SECRET|DEMO_USER_PASSWORD|GOOGLE_CLIENT_SECRET)\s*=\s*(.*)$/);
  if (!match) return false;
  const value = match[1].replace(/\s+#.*$/, '').trim();
  return value !== '' && value !== "''" && value !== '""';
}
