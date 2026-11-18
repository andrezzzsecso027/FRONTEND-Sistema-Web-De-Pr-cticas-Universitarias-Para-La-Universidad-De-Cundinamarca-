import { test, expect } from '@playwright/test';
import { ApiSimulada, respuestaLogin, ESTUDIANTE_ACTUAL, OFERTAS, EMPRESA_APROBADA } from './support/api-mock';

/**
 * HU: Inicio de sesión (RF autenticación con JWT).
 * Valida el formulario, cada mensaje de error del backend y la redirección según el rol.
 */
test.describe('Autenticación', () => {
  let api: ApiSimulada;

  test.beforeEach(async ({ page }) => {
    api = new ApiSimulada()
      .get(/^\/admin\/empresas\/todas/, { json: [EMPRESA_APROBADA] })
      .get(/^\/estudiantes\/me$/, { json: ESTUDIANTE_ACTUAL })
      .get(/^\/ofertas\/estudiantes/, { json: OFERTAS });
    await api.instalar(page);
    await page.goto('/login');
  });

  test('E2E-AUTH-01 · no envía el formulario vacío ni con un correo mal escrito', async ({ page }) => {
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();
    await page.getByLabel('Correo electrónico').fill('correo-sin-arroba');
    await page.getByLabel('Contraseña').fill('Clave123*');
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(api.llamadasA('POST', /^\/auth\/login/)).toHaveLength(0);
  });

  test('E2E-AUTH-02 · credenciales incorrectas (401) muestran un mensaje claro', async ({ page }) => {
    api.post(/^\/auth\/login/, { status: 401, text: 'Credenciales inválidas' });

    await page.getByLabel('Correo electrónico').fill('lgomez@ucundinamarca.edu.co');
    await page.getByLabel('Contraseña').fill('ClaveErronea1');
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(api.llamadasA('POST', /^\/auth\/login/)[0].body).toEqual({
      email: 'lgomez@ucundinamarca.edu.co',
      password: 'ClaveErronea1'
    });
  });

  test('E2E-AUTH-03 · empresa pendiente de aprobación (403) no puede ingresar', async ({ page }) => {
    api.post(/^\/auth\/login/, { status: 403, text: 'Cuenta pendiente' });

    await page.getByLabel('Correo electrónico').fill('rrhh@nuevaempresa.co');
    await page.getByLabel('Contraseña').fill('Empresa123*');
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

    await expect(page.getByText('pendiente de verificación por el administrador')).toBeVisible();
  });

  test('E2E-AUTH-04 · backend caído: avisa que no hay conexión', async ({ page }) => {
    await page.route('**/api/auth/login', route => route.abort('connectionrefused'));

    await page.getByLabel('Correo electrónico').fill('lgomez@ucundinamarca.edu.co');
    await page.getByLabel('Contraseña').fill('Clave123*');
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

    await expect(page.getByText('No se pudo conectar con el servidor')).toBeVisible();
  });

  for (const [rol, destino] of [
    ['administrador', /\/panel-administrador$/],
    ['empresa', /\/panel-empresa$/],
    ['estudiante', /\/ofertas$/]
  ] as const) {
    test(`E2E-AUTH-05 · login de ${rol} guarda el token y redirige a su panel`, async ({ page }) => {
      const resp = respuestaLogin(rol);
      api.post(/^\/auth\/login/, { json: resp });

      await page.getByLabel('Correo electrónico').fill(resp.email);
      await page.getByLabel('Contraseña').fill('Clave123*');
      await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

      await expect(page).toHaveURL(destino);
      expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(resp.token);

      // El interceptor adjunta el JWT a las peticiones siguientes hacia nuestra API.
      await expect.poll(() => api.llamadas.filter(l => !l.path.startsWith('/auth/')).length).toBeGreaterThan(0);
      const autenticadas = api.llamadas.filter(l => !l.path.startsWith('/auth/'));
      expect(autenticadas.every(l => l.authorization === `Bearer ${resp.token}`)).toBe(true);
    });
  }

  test('E2E-AUTH-06 · estudiante sin activar: activa la cuenta con el código y entra', async ({ page }) => {
    let activada = false;
    api
      .post(/^\/auth\/login/, () => activada ? { json: respuestaLogin('estudiante') } : { status: 403, text: 'Cuenta no activada' })
      .post(/^\/estudiantes\/auth\/verificar/, () => { activada = true; return { text: 'Cuenta activada correctamente.' }; });

    await page.getByLabel('Correo electrónico').fill('lgomez@ucundinamarca.edu.co');
    await page.getByLabel('Contraseña').fill('Clave123*');
    await page.getByRole('button', { name: 'Acceder a la plataforma' }).click();

    await expect(page.getByRole('heading', { name: 'Activa tu cuenta institucional' })).toBeVisible();

    // Código incompleto: se valida en el cliente sin llamar al backend.
    await page.getByPlaceholder('000000').fill('123');
    await page.getByRole('button', { name: 'Activar e iniciar sesión' }).click();
    await expect(page.getByText('Ingresa el código de 6 dígitos.')).toBeVisible();
    expect(api.llamadasA('POST', /^\/estudiantes\/auth\/verificar/)).toHaveLength(0);

    await page.getByPlaceholder('000000').fill('482913');
    await page.getByRole('button', { name: 'Activar e iniciar sesión' }).click();

    await expect(page.getByText('Cuenta activada correctamente.')).toBeVisible();
    await expect(page).toHaveURL(/\/ofertas$/);
    expect(api.llamadasA('POST', /^\/estudiantes\/auth\/verificar/)[0].body).toEqual({
      email: 'lgomez@ucundinamarca.edu.co',
      code: '482913'
    });
  });
});
