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

async function completeStrengthWorkout(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Entrenamientos' }).click();
  await page.getByRole('link', { name: 'Nuevo entrenamiento' }).click();
  await page.getByLabel('Nombre').fill('Fuerza IA');
  await page.getByLabel('Buscar movimiento').fill('barbell full squat');
  await page
    .getByRole('button', { name: /barbell full squat/i })
    .first()
    .click();
  await page.getByLabel('Carga', { exact: true }).fill('100');
  await page.getByLabel('Unidad de carga').selectOption('POUND');
  await page.getByLabel('Unidad de carga').selectOption('KILOGRAM');
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page).toHaveURL(/\/app\/workouts\/[0-9a-f-]+$/);

  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Serie 1 reps').fill('1');
  await page.getByLabel('Serie 1 carga').fill('100');
  await page.getByRole('button', { name: 'Completar' }).click();
  await expect(page.getByText('Entrenamiento completado')).toBeVisible();
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
  await expect(page.getByText(/perfil guardado/i)).toBeVisible();

  await completeStrengthWorkout(page);

  await page.goto('/app/ai');
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('button', { name: 'Analizar mi progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  const summary = await page.getByRole('heading', { name: 'Resumen' }).locator('..').locator('p').innerText();
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
  await page.getByText('Evidencia', { exact: true }).first().click();
  await screenshot(page, 'ai-history-detail.png');
});

