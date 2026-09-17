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

test('rendimiento del WOD Fran', async ({ page }) => {
  await page.goto('/app/wods/fran');
  await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu rendimiento' })).toBeVisible();
  await screenshot(page, 'wod-performance.png');
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Comparación de periodos' })).toBeVisible();
  await screenshot(page, 'period-comparison.png');
});
