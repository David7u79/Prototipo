// Imprime /avance a public/avance/garfit-avance.pdf con Edge/Chrome en modo headless.
// Requiere `astro build` previo; levanta `astro preview` el tiempo justo para imprimir.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const browser = [
  process.env.BROWSER_BIN,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
if (!browser) throw new Error('No encontré Edge ni Chrome; define BROWSER_BIN');

const port = 4329;
const out = resolve('public/avance/garfit-avance.pdf');
const server = spawn('pnpm', ['exec', 'astro', 'preview', '--port', String(port)], { shell: true });

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/avance`)).ok) break;
    } catch {}
    if (i > 60) throw new Error('astro preview no respondió');
    await new Promise((r) => setTimeout(r, 500));
  }
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--virtual-time-budget=10000',
    `--print-to-pdf=${out}`,
    `http://localhost:${port}/avance`,
  ]);
  console.log(`PDF: ${out}`);
} finally {
  server.kill();
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/t', '/f']);
}
