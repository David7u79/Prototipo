import { expect, test, type Page } from '@playwright/test';

const evidence = '../../docs/evidence/fase-4/capturas';

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

async function registerAndCreateProfile(page: Page) {
  const suffix = Date.now();
  const email = `wod-${suffix}@example.com`;
  const password = `GarFit-${suffix}-safe`;

  await page.goto('/login');
  await page.getByRole('link', { name: 'Regístrate' }).click();
  await page.getByLabel('Nombre').fill('Atleta WOD');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /crear/i }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await page.getByLabel('Nombre visible').fill('Atleta WOD');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText(/perfil guardado/i)).toBeVisible();
}

test('crear y explicar WOD personal', async ({ page }) => {
  await registerAndCreateProfile(page);

  await page.goto('/app/wods/new');
  await page.getByLabel('Nombre').fill('WOD personal');
  await page.getByLabel('Tipo').selectOption('FOR_TIME');
  await page.getByLabel('Buscar movimiento').fill('run');
  await page.getByRole('button', { name: /run/i }).first().click();
  await page.getByLabel('Repeticiones').fill('400');
  await screenshot(page, 'wod-new.png');
  await page.getByRole('button', { name: 'Guardar WOD' }).click();

  await expect(page.getByRole('heading', { name: 'WOD personal' })).toBeVisible();
  await expect(page.getByText(/400 reps/i)).toBeVisible();
  await page.getByRole('link', { name: 'Explicar WOD' }).click();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('button', { name: 'Explicar un WOD' }).click();

  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  const observation = page.getByRole('article', { name: /^Observación:/ }).first();
  await expect(observation.getByRole('heading')).toBeVisible();
  await observation.getByText('Evidencia', { exact: true }).click();
  await expect(observation.getByRole('listitem', { name: /^Hecho:/ }).first()).toBeVisible();
  await screenshot(page, 'ai-wod-explanation.png');
});
