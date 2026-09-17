import { expect, test, type Page } from '@playwright/test';

const evidence = '../../docs/evidence/generated';

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
  const email = `workout-${Date.now()}@example.com`;
  const password = `GarFit-${Date.now()}-safe`;
  await page.goto('/login');
  await page.getByRole('link', { name: 'Regístrate' }).click();
  await page.getByLabel('Nombre').fill('Atleta Workout');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /crear/i }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await page.getByLabel('Nombre visible').fill('Atleta Workout');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText(/perfil guardado/i)).toBeVisible();
}

test('athlete-flow workout-flow', async ({ page }) => {
  await register(page);

  // 1. /app/workouts lista vacía
  await page.getByRole('navigation').getByRole('link', { name: 'Entrenamientos' }).click();
  await expect(page).toHaveURL(/\/app\/workouts$/);
  await screenshot(page, '10-workouts-list.png');

  // 2. Nuevo entrenamiento STRENGTH "Fuerza A"
  await page.getByRole('link', { name: 'Nuevo entrenamiento' }).click();
  await page.getByLabel('Nombre').fill('Fuerza A');
  await page.getByLabel('Buscar movimiento').fill('barbell full squat');
  await page.getByRole('button', { name: /barbell full squat/i }).click();
  await page.getByLabel('Carga', { exact: true }).fill('100');
  await page.getByLabel('Unidad de carga').selectOption('POUND');
  await page.getByLabel('Unidad de carga').selectOption('KILOGRAM');
  await screenshot(page, '11-workout-builder.png');
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();

  // 3. Empezar "Fuerza A" y registrar 1 rep 100 kg
  await expect(page).toHaveURL(/\/app\/workouts\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Serie 1 reps').fill('1');
  await page.getByLabel('Serie 1 carga').fill('100');
  await screenshot(page, '12-workout-active.png');
  await page.getByRole('button', { name: 'Completar' }).click();

  // 4. Completar "Fuerza A": pantalla "Entrenamiento completado" con "Primera marca"
  await expect(page.getByText('Entrenamiento completado')).toBeVisible();
  await expect(page.getByText('Primera marca')).toBeVisible();
  await screenshot(page, '13-workout-completed.png');

  // 5. Nuevo "Fuerza B" con 105 kg
  await page.getByRole('navigation').getByRole('link', { name: 'Entrenamientos' }).click();
  await page.getByRole('link', { name: 'Nuevo entrenamiento' }).click();
  await page.getByLabel('Nombre').fill('Fuerza B');
  await page.getByLabel('Buscar movimiento').fill('barbell full squat');
  await page.getByRole('button', { name: /barbell full squat/i }).click();
  await page.getByLabel('Carga', { exact: true }).fill('105');
  await page.getByLabel('Unidad de carga').selectOption('POUND');
  await page.getByLabel('Unidad de carga').selectOption('KILOGRAM');
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();

  // 6. Empezar y registrar 105 kg en "Fuerza B"
  await expect(page).toHaveURL(/\/app\/workouts\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Serie 1 reps').fill('1');
  await page.getByLabel('Serie 1 carga').fill('105');
  await page.getByRole('button', { name: 'Completar' }).click();

  // 7. Completar "Fuerza B": ver "+5 kg"
  await expect(page.getByText('Entrenamiento completado')).toBeVisible();
  await expect(page.getByText('+5 kg')).toBeVisible();
  await screenshot(page, '14-workout-detail.png');

  // 8. Historial (/app/workouts)
  await page.getByRole('navigation').getByRole('link', { name: 'Historial' }).click();
  await expect(page).toHaveURL(/\/app\/workouts\?status=COMPLETED$/);
  await screenshot(page, '16-history.png');

  // 9. Abrir "Fuerza B" desde historial y abrir la marca desde su enlace
  await page.getByRole('link', { name: 'Fuerza B', exact: true }).click();
  await page.getByRole('link', { name: /105 kg|Primera marca|→/ }).click();
  // El historial tiene dos marcas derivadas (Fuerza A y Fuerza B): se exige el origen de B.
  await expect(page.getByText('Origen').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Fuerza B/ })).toBeVisible();
  await expect(page.getByText('Gestionada por entrenamiento').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar' })).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Retirar' })).not.toBeVisible();
  await screenshot(page, '15-workout-pr.png');

  // 10. Dashboard
  await page.getByRole('navigation').getByRole('link', { name: 'Inicio' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await screenshot(page, '17-dashboard-workouts.png');

  // 11. FOR_TIME simple con tiempo 5:30 -> completar -> headline "5:30"
  await page.getByRole('navigation').getByRole('link', { name: 'Entrenamientos' }).click();
  await page.getByRole('link', { name: 'Nuevo entrenamiento' }).click();
  await page.getByLabel('Nombre').fill('Metcon');
  await page.getByLabel('Tipo').selectOption('FOR_TIME');
  await page.getByLabel('Buscar movimiento').fill('run');
  await page.getByRole('button', { name: /run/i }).first().click();
  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page).toHaveURL(/\/app\/workouts\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByLabel('Tiempo (mm:ss)').fill('05:30');
  await page.getByRole('button', { name: 'Completar' }).click();
  // El tiempo aparece como headline y como score del detalle.
  await expect(page.getByText('Entrenamiento completado')).toBeVisible();
  await expect(page.getByText('5:30').first()).toBeVisible();
});
