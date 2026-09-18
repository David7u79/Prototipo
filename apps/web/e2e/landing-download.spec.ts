import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const evidence = '../../docs/evidence/fase-5/capturas';
// La versión publicada cambia en cada release: se toma de la fuente única del monorepo en lugar
// de fijarla aquí, que obligaría a tocar la prueba en cada publicación.
const { version } = JSON.parse(readFileSync('../../package.json', 'utf8')) as { version: string };

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${evidence}/${name}`,
    fullPage: false,
    mask: [
      page.locator('input[type="email"]'),
      page.locator('input[name="email"]'),
      page.getByText(/@/),
    ],
  });
}

test('descarga y metadatos de la release Android', async ({ page }) => {
  await page.goto('http://localhost:4321/descargar');

  await expect(page.getByText(new RegExp(`Versión ${version.replace(/\./g, '\\.')}`))).toBeVisible();
  await expect(page.getByText(/MB/)).toBeVisible();
  await expect(page.getByText(/Publicada el/)).toBeVisible();

  const downloadLink = page.getByRole('link', { name: /Descargar para Android/i });
  await expect(downloadLink).toBeVisible();
  await expect(downloadLink).toHaveAttribute('href', /releases\/android\/latest\/download/);

  await expect(page.getByRole('img', { name: /Código QR/i })).toBeVisible();
  await screenshot(page, 'android-download.png');

  await expect(page.getByRole('heading', { name: 'Notas de la versión' })).toBeVisible();
  await expect(page.getByText('SHA-256:')).toBeVisible();
  await page.getByRole('heading', { name: 'Instalación fuera de Play Store' }).scrollIntoViewIfNeeded();
  await screenshot(page, 'android-release-info.png');
});
