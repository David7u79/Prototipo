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

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

test('atleta registra y consulta sus marcas', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = `GarFit-${Date.now()}-safe`;

  // Capturamos la pantalla de login antes de registrarnos
  await page.goto('/login');
  await screenshot(page, '01-login.png');

  await page.getByRole('link', { name: 'Regístrate' }).click();
  await page.getByLabel('Nombre').fill('Atleta E2E');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /crear/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await screenshot(page, '02-dashboard-empty.png');

  await page.getByRole('link', { name: 'Perfil' }).click();
  await page.getByLabel('Nombre visible').fill('Atleta E2E');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText(/perfil guardado/i)).toBeVisible();
  await screenshot(page, '03-profile.png');
  await page.getByRole('link', { name: 'Movimientos' }).click();
  await page.getByLabel('Buscar').fill('barbell full squat');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByText('Barbell full squat')).toBeVisible();
  await screenshot(page, '04-movements.png');
  await page.getByRole('link', { name: 'Barbell full squat' }).click();
  await screenshot(page, '05-movement-detail.png');
  await page.getByRole('link', { name: 'Registrar una marca' }).click();
  await page.getByLabel('Valor').fill('100');
  await page.getByLabel('Fecha').fill(dateDaysAgo(60));
  await screenshot(page, '06-record-form.png');
  await page.getByRole('button', { name: 'Guardar marca' }).click();
  await page.getByRole('link', { name: 'Registrar marca' }).click();
  await page.getByLabel('Buscar movimiento').fill('barbell full squat');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('link', { name: 'Barbell full squat' }).click();
  await page.getByLabel('Valor').fill('105');
  await page.getByLabel('Fecha').fill(dateDaysAgo(10));
  await page.getByRole('button', { name: 'Guardar marca' }).click();
  await page.getByRole('link', { name: 'Volver a mis marcas' }).click();
  await screenshot(page, '07-records.png');
  await page.getByRole('link', { name: 'Ver historial' }).click();
  await expect(page.getByText('105 kg')).toBeVisible();
  await expect(page.getByText('+5 kg')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Evolución de marcas' })).toBeVisible();
  await screenshot(page, '08-record-history.png');
  await page.getByRole('link', { name: 'Inicio' }).click();
  await expect(page.getByText('Movimientos con marca')).toBeVisible();
  await expect(page.getByText('1', { exact: true })).toBeVisible();
  await screenshot(page, '09-dashboard.png');
});
