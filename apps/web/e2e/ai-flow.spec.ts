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
  const email = `ia-${suffix}@example.com`;
  const password = `GarFit-${suffix}-safe`;

  await page.goto('/login');
  await page.getByRole('link', { name: 'Regístrate' }).click();
  await page.getByLabel('Nombre').fill('Atleta IA');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /crear/i }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await page.getByLabel('Nombre visible').fill('Atleta IA');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText(/perfil guardado/i)).toBeVisible();
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

  const workoutUrl = page.url();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Serie 1 reps').fill('1');
  await page.getByLabel('Serie 1 carga').fill('100');
  await page.getByRole('button', { name: 'Completar' }).click();
  await expect(page.getByText('Entrenamiento completado')).toBeVisible();

  return workoutUrl;
}

async function expectAnalysisWithEvidence(page: Page) {
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  const observation = page.getByRole('article', { name: /^Observación:/ }).first();
  await expect(observation.getByRole('heading')).toBeVisible();
  await observation.getByText('Evidencia', { exact: true }).click();
  await expect(observation.getByRole('listitem', { name: /^Hecho:/ }).first()).toBeVisible();
}

test('flujo de análisis IA', async ({ page }) => {
  await registerAndCreateProfile(page);
  const workoutUrl = await completeStrengthWorkout(page);

  await page.goto('/app/ai');
  await expect(page.getByRole('button', { name: 'Aceptar y continuar' })).toBeVisible();
  await screenshot(page, 'ai-consent.png');
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await expect(page.getByRole('button', { name: 'Analizar mi progreso' })).toBeVisible();
  await screenshot(page, 'ai-home.png');

  await page.getByRole('button', { name: 'Analizar mi progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  const observation = page.getByRole('article', { name: /^Observación:/ }).first();
  await expect(observation.getByRole('heading')).toBeVisible();
  await screenshot(page, 'ai-progress-analysis.png');
  await observation.getByText('Evidencia', { exact: true }).click();
  await expect(observation.getByRole('listitem', { name: /^Hecho:/ }).first()).toBeVisible();
  await screenshot(page, 'ai-evidence.png');

  await page.goto(workoutUrl);
  await page.getByRole('link', { name: 'Analizar entrenamiento' }).click();
  await page.getByRole('button', { name: 'Analizar mi último entrenamiento' }).click();
  await expectAnalysisWithEvidence(page);
  await screenshot(page, 'ai-workout-analysis.png');

  await page.goto('/app/movements/barbell-full-squat');
  await page.getByRole('link', { name: 'Explicar con IA' }).click();
  await page.getByRole('button', { name: 'Explicar un movimiento' }).click();
  await expectAnalysisWithEvidence(page);
  await screenshot(page, 'ai-movement-explanation.png');
});
