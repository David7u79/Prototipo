import { expect, test, type Page } from '@playwright/test';

const evidence = '../../docs/evidence/generated';

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${evidence}/${name}`,
    fullPage: false,
    mask: [page.locator('input[type="email"]'), page.getByText(/@/)],
  });
}

async function register(page: Page) {
  const email = `workout-${Date.now()}@example.com`;
  await page.goto('/login');
  await page.getByRole('link', { name: 'Regístrate' }).click();
  await page.getByLabel('Nombre').fill('Atleta Workout');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(`GarFit-${Date.now()}-safe`);
  await page.getByRole('button', { name: /crear/i }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
}

async function newStrength(page: Page, name: string, load: string) {
  await page.getByRole('navigation').getByRole('link', { name: 'Entrenamientos' }).click();
  await screenshot(page, '10-workouts-list.png');
  await page.getByRole('link', { name: 'Nuevo entrenamiento' }).click();
  await page.getByLabel('Nombre').fill(name);
  await page.getByLabel('Buscar movimiento').fill('barbell full squat');
  await page.getByRole('button', { name: /barbell full squat/i }).click();
  await page.getByLabel('Carga').fill(load);
  await screenshot(page, '11-workout-builder.png');
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Serie 1 reps').fill('1');
  await page.getByLabel('Serie 1 carga').fill(load);
  await screenshot(page, '12-workout-active.png');
  await page.getByRole('button', { name: 'Completar' }).click();
  await expect(page.getByText('Entrenamiento completado')).toBeVisible();
  await screenshot(page, '13-workout-completed.png');
}

test('athlete-flow workout-flow', async ({ page }) => {
  await register(page);
  await newStrength(page, 'Fuerza A', '100');
  await expect(page.getByText('Primera marca')).toBeVisible();
  await newStrength(page, 'Fuerza B', '105');
  await expect(page.getByText('+5 kg')).toBeVisible();
  await screenshot(page, '14-workout-detail.png');
  await page.getByRole('link', { name: /105 kg|Primera marca|→/ }).click();
  await expect(page.getByText('Origen')).toBeVisible();
  await expect(page.getByText('Fuerza B')).toBeVisible();
  await screenshot(page, '15-workout-pr.png');
  await page.getByRole('navigation').getByRole('link', { name: 'Historial' }).click();
  await page.getByRole('link', { name: 'Fuerza B', exact: true }).click();
  await screenshot(page, '16-history.png');
  await page.getByRole('navigation').getByRole('link', { name: 'Inicio' }).click();
  await screenshot(page, '17-dashboard-workouts.png');
  await page.getByRole('navigation').getByRole('link', { name: 'Entrenamientos' }).click();
  await page.getByRole('link', { name: 'Nuevo entrenamiento' }).click();
  await page.getByLabel('Nombre').fill('Metcon');
  await page.getByLabel('Tipo').selectOption('FOR_TIME');
  await page.getByLabel('Buscar movimiento').fill('run');
  await page.getByRole('button', { name: /run/i }).first().click();
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Tiempo (mm:ss)').fill('05:30');
  await page.getByRole('button', { name: 'Completar' }).click();
  await expect(page.getByText('5:30')).toBeVisible();
});
