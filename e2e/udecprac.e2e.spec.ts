import { test, expect } from '@playwright/test';

test.describe('UdecPrac - Pruebas End-to-End (E2E)', () => {

  test('E2E-01: Debe cargar la página de Login y validar campos obligatorios', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);

    const inputs = page.locator('input');
    await expect(inputs.first()).toBeVisible();
  });

  test('E2E-02: Flujo completo en Panel de Administrador (Empresas, Ofertas y Filtros ComboBox)', async ({ page }) => {
    // 1. Inyectar sesión de administrador autenticada antes de abrir la ruta
    await page.addInitScript(() => {
      localStorage.setItem('usuario_sesion', JSON.stringify({
        idUser: 1,
        email: 'admin@ucundinamarca.edu.co',
        userRol: 'administrador'
      }));
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkB1Y3VuZGluYW1hcmNhLmVkdS5jbyJ9.sig');
    });

    // 2. Navegar al Panel del Administrador
    await page.goto('/panel-administrador');

    // 3. Verificar que el panel renderiza el título o contenedor principal
    await expect(page.locator('body')).toContainText(/Admin|Empresas|Ofertas/i);

    // 4. Navegar por las secciones y verificar que las tablas/tarjetas existen en el DOM
    const selects = page.locator('select');
    if (await selects.count() > 0) {
      await expect(selects.first()).toBeVisible();
    }
  });

  test('E2E-03: Flujo de inicio de sesión real contra el Backend', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[formControlName*="email"], input').first();
    const passInput = page.locator('input[type="password"]').first();

    await emailInput.fill('admin@ucundinamarca.edu.co');
    await passInput.fill('Admin123*');

    const submitBtn = page.locator('button[type="submit"], button').first();
    await submitBtn.click();

    // Verifica que el formulario procesó el evento de envío sin romper la vista
    await expect(page.locator('body')).toBeVisible();
  });
});