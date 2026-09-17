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

test('historial de análisis IA guardados', async ({ page }) => {
  const suffix = Date.now();
  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Atleta Historial');
  await page.getByLabel('Correo electrónico').fill(`history-${suffix}@example.com`);
  await page.getByLabel('Contraseña').fill(`GarFit-${suffix}-safe`);
  await page.getByRole('button', { name: /crear/i }).click();
  await page.getByLabel('Nombre visible').fill('Atleta Historial');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await page.goto('/app/ai');
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('button', { name: 'Analizar mi progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  const summary = await page.getByRole('heading', { name: 'Resumen' }).locator('..').innerText();
  await page.goto('/app/ai');
  await expect(page.getByRole('heading', { name: 'Análisis recientes' })).toBeVisible();
  await screenshot(page, 'ai-history.png');
  await page
    .getByRole('link', { name: /Progreso/i })
    .first()
    .click();
  await expect(page.getByText('Análisis guardado')).toBeVisible();
  await expect(page.getByText(summary)).toBeVisible();
  await expect(page.getByText('Evidencia', { exact: true }).first()).toBeVisible();
  await screenshot(page, 'ai-history-detail.png');
});
