import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas E2E con Playwright.
 *   npx playwright test                 → todas (las de backend real se omiten si no está corriendo)
 *   npx playwright test --grep-invert @real → solo las de API simulada
 *   npx playwright show-report          → informe HTML con videos
 * Si no hay un `ng serve` corriendo en :4200, Playwright lo levanta solo.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:4200',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on' // Graba video de cada prueba E2E para la sustentación
  },
  webServer: {
    command: 'npx ng serve --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
