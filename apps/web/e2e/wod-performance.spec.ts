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

async function register(page: Page) {
  const suffix = Date.now();
  const email = `wod-perf-${suffix}@example.com`;
  const password = `GarFit-${suffix}-safe`;
  await page.goto('/login');
  await page.getByRole('link', { name: 'Regístrate' }).click();
  await page.getByLabel('Nombre').fill('Atleta Rendimiento');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /crear/i }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await page.getByLabel('Nombre visible').fill('Atleta Rendimiento');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText(/perfil guardado/i)).toBeVisible();
}

async function completeFran(page: Page, time: string) {
  await page.goto('/app/wods/fran');
  await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar este WOD' }).click();
  await expect(page).toHaveURL(/\/app\/workouts\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Serie 1 reps').first().fill('21');
  await page.getByLabel('Serie 1 reps').nth(1).fill('21');
  await page.getByLabel('Tiempo (mm:ss)').fill(time);
  await page.getByRole('button', { name: 'Completar' }).click();
  await expect(page.getByText('Entrenamiento completado')).toBeVisible();
}

test('rendimiento del WOD Fran', async ({ page }) => {
  await register(page);

  await completeFran(page, '05:30');
  await completeFran(page, '04:45');

  await page.goto('/app/wods/fran');
  await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu rendimiento' })).toBeVisible();
  await expect(page.getByText('Mejor')).toBeVisible();
  await expect(page.getByText('Anterior')).toBeVisible();
  await expect(page.getByText('Cambio')).toBeVisible();
  await screenshot(page, 'wod-performance.png');

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Comparación de periodos' })).toBeVisible();
  await screenshot(page, 'period-comparison.png');
});

