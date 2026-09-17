import { expect, test, type Page } from '@playwright/test';

const evidence = '../../docs/evidence/fase-5/capturas';

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

  await expect(page.getByText(/Versión 0\.5\.0/)).toBeVisible();
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
