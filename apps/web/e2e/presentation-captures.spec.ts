import { expect, test, type Page } from '@playwright/test';

const evidence = '../../docs/evidence/fase-6/capturas';

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

test('capturas de presentacion GarFit', async ({ page }) => {
  // 1. landing.png: portada de la landing
  await page.goto('http://localhost:4321/');
  await expect(page.getByRole('heading', { name: 'Entrena. Registra. Evoluciona.' })).toBeVisible();
  await screenshot(page, 'landing.png');

  // 2. login.png: pantalla de login
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await screenshot(page, 'login.png');

  // Iniciar sesión con el atleta de demostración
  await page.getByLabel('Correo electrónico').fill('demo@garfit.example');
  await page.getByLabel('Contraseña').fill('DemoGarFit2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app$/);

  // 3. dashboard.png: panel de inicio con la comparación de periodos visible
  await expect(page.getByRole('heading', { name: 'Comparación de periodos' })).toBeVisible();
  await page.getByRole('heading', { name: 'Comparación de periodos' }).scrollIntoViewIfNeeded();
  await screenshot(page, 'dashboard.png');

  // 4. movimientos.png: catálogo con una búsqueda real
  await page.getByRole('navigation').getByRole('link', { name: 'Movimientos' }).click();
  await expect(page).toHaveURL(/\/app\/movements$/);
  await page.getByLabel('Buscar').fill('barbell full squat');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByRole('heading', { name: 'Movimientos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Barbell full squat' })).toBeVisible();
  await screenshot(page, 'movimientos.png');

  // 5. marca.png: detalle o historial de una marca personal
  await page.goto('/app/records/barbell-bench-press');
  await expect(page.getByRole('heading', { name: 'Barbell bench press' })).toBeVisible();
  await expect(page.getByText('82.5 kg').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar' })).toBeVisible();
  await screenshot(page, 'marca.png');

  // 6. workout.png: detalle de un entrenamiento completado con su volumen y sus marcas derivadas
  await page.goto('/app/workouts?status=COMPLETED');
  await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();
  await page.getByRole('link', { name: 'Sentadilla 110 kg' }).click();
  await expect(page.getByRole('heading', { name: 'Entrenamiento completado: Sentadilla 110 kg' })).toBeVisible();
  await expect(page.getByText('Volumen total: 110 kg')).toBeVisible();
  await expect(page.getByText('1 marca personal')).toBeVisible();
  await expect(page.getByRole('link', { name: /105 kg → 110 kg/ })).toBeVisible();
  await screenshot(page, 'workout.png');

  // 7. wod.png: detalle de un WOD con la sección «Tu rendimiento»
  await page.goto('/app/wods/fran');
  await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu rendimiento' })).toBeVisible();
  await expect(page.getByText('Mejor', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Anterior', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Cambio', { exact: true }).first()).toBeVisible();
  await screenshot(page, 'wod.png');

  // 8. progreso.png: evolución de una marca o del WOD, donde se vea la gráfica
  await page.goto('/app/records/barbell-full-squat');
  await expect(page.getByRole('heading', { name: 'Barbell full squat' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Evolución de marcas' })).toBeVisible();
  await screenshot(page, 'progreso.png');

  // 9. ia.png: pantalla de asistente con sus acciones
  await page.goto('/app/ai');
  await expect(page.getByRole('heading', { name: 'Análisis explicativo de tu entrenamiento' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Analizar mi progreso' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Analizar mi último entrenamiento' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Explicar un WOD' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Explicar un movimiento' })).toBeVisible();
  await screenshot(page, 'ia.png');

  // 10. ia-historial.png: sección «Análisis recientes»
  await page.getByRole('heading', { name: 'Análisis recientes' }).evaluate((el) => el.scrollIntoView());
  await expect(page.getByRole('heading', { name: 'Análisis recientes' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Progreso/i }).first()).toBeVisible();
  await screenshot(page, 'ia-historial.png');

  // 11. ia-evidencia.png: una observación con su evidencia desplegada
  await page.getByRole('link', { name: /Progreso/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  const observation = page.getByRole('article', { name: /^Observación:/ }).first();
  await expect(observation.getByRole('heading')).toBeVisible();
  await observation.getByText('Evidencia', { exact: true }).click();
  await expect(observation.getByRole('listitem', { name: /^Hecho:/ }).first()).toBeVisible();
  await screenshot(page, 'ia-evidencia.png');

  // 12. android-descarga.png: página de descarga de la landing con versión, tamaño, QR y SHA-256
  await page.goto('http://localhost:4321/descargar');
  await expect(page.getByText(/Versión 0\.9\.0-rc\.1/)).toBeVisible();
  await expect(page.getByText(/MB/)).toBeVisible();
  await expect(page.getByRole('img', { name: /Código QR/i })).toBeVisible();
  await expect(page.getByText('SHA-256:')).toBeVisible();
  await page.locator('[data-android-download]').scrollIntoViewIfNeeded();
  await screenshot(page, 'android-descarga.png');
});
