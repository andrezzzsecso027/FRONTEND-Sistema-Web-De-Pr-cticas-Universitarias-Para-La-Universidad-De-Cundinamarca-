import { test, expect, request } from '@playwright/test';

/**
 * Smoke de integración real (frontend + backend Spring Boot + base de datos), sin simular la API.
 * Se omite automáticamente si el backend no está corriendo en http://localhost:8081.
 * El login exitoso necesita un administrador que exista en la BD a la que apunta el backend:
 *   $env:E2E_ADMIN_EMAIL='...'; $env:E2E_ADMIN_PASSWORD='...'; npx playwright test e2e/06-backend-real.spec.ts
 */
const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? '';
const ADMIN_PASSWORD = process.env['E2E_ADMIN_PASSWORD'] ?? '';

test.describe('Integración con el backend real @real', () => {
  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const disponible = await ctx.get('http://localhost:8081/api/ofertas/estudiantes', { timeout: 3000 })
      .then(() => true).catch(() => false);
    await ctx.dispose();
    test.skip(!disponible, 'Backend no disponible en localhost:8081');
  });

  test('E2E-REAL-01 · credenciales incorrectas son rechazadas por el backend', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL || 'no.existe.e2e@ucundinamarca.edu.co');
    await page.getByLabel('Contraseña').fill('ClaveIncorrecta999!');
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
  });

  test('E2E-REAL-02 · el administrador inicia sesión con JWT real y carga su panel', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Define E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD');
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);

    const respuestaEmpresas = page.waitForResponse(r => r.url().includes('/api/admin/empresas/todas'));
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

    await expect(page).toHaveURL(/\/panel-administrador$/);
    // El endpoint protegido responde 200 gracias al Bearer token que adjunta el interceptor.
    expect((await respuestaEmpresas).status()).toBe(200);
    await expect(page.getByRole('navigation', { name: 'Secciones del panel' })).toBeVisible();
  });
});
