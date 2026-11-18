import { test, expect } from '@playwright/test';
import { ApiSimulada, sembrarSesion, ESTUDIANTE_ACTUAL, OFERTAS } from './support/api-mock';

/**
 * Control de acceso en el cliente: guards por rol, expiración del JWT, 401 del backend
 * y confirmación de cierre de sesión al volver a una página pública.
 */
test.describe('Guards y sesión', () => {
  let api: ApiSimulada;

  test.beforeEach(async ({ page }) => {
    api = new ApiSimulada()
      .get(/^\/estudiantes\/me$/, { json: ESTUDIANTE_ACTUAL })
      .get(/^\/ofertas\/estudiantes/, { json: OFERTAS });
    await api.instalar(page);
  });

  for (const ruta of ['/panel-administrador', '/panel-empresa', '/ofertas', '/mis-postulaciones', '/mi-practica', '/mi-perfil']) {
    test(`E2E-SEG-01 · sin sesión, ${ruta} redirige al login`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('E2E-SEG-02 · un estudiante no puede abrir el panel de administrador ni el de empresa', async ({ page }) => {
    await sembrarSesion(page, 'estudiante');

    await page.goto('/panel-administrador');
    await expect(page).toHaveURL(/\/ofertas$/);

    await page.goto('/panel-empresa');
    await expect(page).toHaveURL(/\/ofertas$/);
  });

  test('E2E-SEG-03 · una empresa no puede abrir el portal del estudiante', async ({ page }) => {
    await sembrarSesion(page, 'empresa');
    await page.goto('/mis-postulaciones');
    await expect(page).toHaveURL(/\/panel-empresa$/);
  });

  test('E2E-SEG-04 · con el token vencido se trata como sesión cerrada', async ({ page }) => {
    await sembrarSesion(page, 'administrador', { expiraEnSegundos: -60 });
    await page.goto('/panel-administrador');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('E2E-SEG-05 · si el backend responde 401 (token inválido) se cierra la sesión', async ({ page }) => {
    api.get(/^\/estudiantes\/me$/, { status: 401, text: '' });
    await sembrarSesion(page, 'estudiante');

    await page.goto('/ofertas');

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('E2E-SEG-06 · con sesión abierta, ir al login pregunta si cerrar sesión (opción "Quedarme")', async ({ page }) => {
    await sembrarSesion(page, 'estudiante');
    await page.goto('/login');

    const dialogo = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('lgomez@ucundinamarca.edu.co');

    await dialogo.getByRole('button', { name: 'Quedarme en mi panel' }).click();
    await expect(page).toHaveURL(/\/ofertas$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).not.toBeNull();
  });

  test('E2E-SEG-07 · con sesión abierta, ir al login y confirmar cierra la sesión', async ({ page }) => {
    await sembrarSesion(page, 'estudiante');
    await page.goto('/login');

    await page.getByRole('alertdialog', { name: '¿Cerrar sesión?' })
      .getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('E2E-SEG-08 · "Cerrar sesión" desde el menú de usuario limpia la sesión', async ({ page }) => {
    await sembrarSesion(page, 'estudiante');
    await page.goto('/ofertas');

    await page.getByRole('button', { name: /Laura Gómez/ }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('usuario_sesion'))).toBeNull();

    // Volver atrás ya no da acceso al portal.
    await page.goto('/ofertas');
    await expect(page).toHaveURL(/\/login$/);
  });
});
