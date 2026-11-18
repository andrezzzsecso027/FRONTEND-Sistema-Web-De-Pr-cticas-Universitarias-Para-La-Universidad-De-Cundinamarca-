import { test, expect } from '@playwright/test';
import {
  ApiSimulada, sembrarSesion, EMPRESA_APROBADA, OFERTAS, PERFIL_COMPLETO, DOC_ESTUDIANTE
} from './support/api-mock';

/**
 * Panel de empresa: sus ofertas, revisión de postulantes y decisión (aceptar / rechazar).
 * La empresa es quien mueve el estado de la postulación (EN_REVISION → ACEPTADA | RECHAZADA).
 */
test.describe('Panel de empresa', () => {
  let api: ApiSimulada;
  let postulantes: any[];

  test.beforeEach(async ({ page }) => {
    postulantes = [
      { idPostulation: 501, idOffer: 101, studentFullName: 'Laura Gómez', documentStudent: DOC_ESTUDIANTE,
        studentEmail: 'lgomez@ucundinamarca.edu.co', statusPostulation: 'POSTULADA' },
      { idPostulation: 502, idOffer: 101, studentFullName: 'Andrés Ruiz', documentStudent: '1070698765',
        studentEmail: 'aruiz@ucundinamarca.edu.co', statusPostulation: 'POSTULADA' }
    ];
    api = new ApiSimulada()
      .get(/^\/admin\/empresas\/todas/, { json: [EMPRESA_APROBADA] })
      .get(/^\/admin\/ofertas/, { json: OFERTAS })
      .get(/^\/postulaciones\/oferta\/101/, () => ({ json: postulantes }))
      .get(/^\/registro\/estudiantes\/perfil\//, { json: PERFIL_COMPLETO })
      .patch(/^\/postulaciones\/\d+\/estado/, (req, url) => {
        const id = Number(url.pathname.split('/').at(-2));
        const p = postulantes.find(x => x.idPostulation === id);
        if (p) p.statusPostulation = req.postDataJSON().newStatus;
        return { json: { idPostulation: id, statusPostulation: p?.statusPostulation } };
      });
    await api.instalar(page);
    await sembrarSesion(page, 'empresa');
    await page.goto('/panel-empresa');
  });

  test('E2E-EMP-01 · identifica a la empresa y solo muestra SUS ofertas', async ({ page }) => {
    await expect(page.getByRole('button', { name: /TechAndes SAS/ })).toBeVisible();

    await page.getByRole('navigation').getByRole('button', { name: /Mis ofertas/ }).click();
    await expect(page.getByRole('row', { name: /Desarrollador Frontend Angular/ })).toBeVisible();
    // La oferta de otro NIT no aparece.
    await expect(page.getByRole('row', { name: /Auxiliar contable/ })).toHaveCount(0);
  });

  test('E2E-EMP-02 · acepta a un postulante con un mensaje y se envía el nuevo estado', async ({ page }) => {
    await page.getByRole('navigation').getByRole('button', { name: /Mis ofertas/ }).click();
    await page.getByRole('row', { name: /Desarrollador Frontend Angular/ }).getByRole('button', { name: 'Postulantes' }).click();

    await expect(page.getByRole('heading', { name: 'Desarrollador Frontend Angular' })).toBeVisible();
    const laura = page.locator('article', { hasText: 'Laura Gómez' });
    await expect(laura).toContainText('En revisión');
    await expect(laura).toContainText('Angular, TypeScript'); // completado con su perfil profesional

    await laura.getByLabel(/Mensaje para el estudiante/).fill('Te esperamos el lunes a las 8:00 a. m.');
    await laura.getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByRole('status')).toContainText('Has ACEPTADO a Laura Gómez');
    await expect(laura).toContainText('Practicante aceptado');
    await expect(laura.getByRole('button', { name: 'Aceptar' })).toHaveCount(0);
    expect(api.llamadasA('PATCH', /^\/postulaciones\/501\/estado/)[0].body).toEqual({
      newStatus: 'ACEPTADA',
      observations: 'Te esperamos el lunes a las 8:00 a. m.'
    });
    // Se descuenta un cupo de la oferta.
    await expect(page.getByText('1 cupo(s) disponibles')).toBeVisible();
  });

  test('E2E-EMP-03 · rechaza a un postulante (mensaje por defecto si no escribe uno)', async ({ page }) => {
    await page.getByRole('navigation').getByRole('button', { name: /Mis ofertas/ }).click();
    await page.getByRole('row', { name: /Desarrollador Frontend Angular/ }).getByRole('button', { name: 'Postulantes' }).click();

    const andres = page.locator('article', { hasText: 'Andrés Ruiz' });
    await andres.getByRole('button', { name: 'Rechazar' }).click();

    await expect(page.getByRole('status')).toContainText('Se ha RECHAZADO la postulación de Andrés Ruiz');
    await expect(andres).toContainText('Rechazada');
    expect(api.llamadasA('PATCH', /^\/postulaciones\/502\/estado/)[0].body).toEqual({
      newStatus: 'RECHAZADA',
      observations: 'Perfil no seleccionado en esta convocatoria.'
    });
  });

  test('E2E-EMP-04 · si el backend rechaza el cambio de estado se informa el motivo', async ({ page }) => {
    api.patch(/^\/postulaciones\/\d+\/estado/, { status: 409, text: 'La oferta ya no tiene cupos disponibles.' });

    await page.getByRole('navigation').getByRole('button', { name: /Mis ofertas/ }).click();
    await page.getByRole('row', { name: /Desarrollador Frontend Angular/ }).getByRole('button', { name: 'Postulantes' }).click();
    await page.locator('article', { hasText: 'Laura Gómez' }).getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByRole('alert')).toContainText('La oferta ya no tiene cupos disponibles.');
    await expect(page.locator('article', { hasText: 'Laura Gómez' })).toContainText('En revisión');
  });

  test('E2E-EMP-05 · ranking de postulados con IA', async ({ page }) => {
    api.get(/^\/ia\/ranking-postulados\/101/, {
      json: { idOffer: 101, practiceName: 'Desarrollador Frontend Angular', totalCandidatesAnalyzed: 2,
        aiRankingAnalysis: '1. Laura Gómez — 92% de afinidad.' }
    });

    await page.getByRole('navigation').getByRole('button', { name: /Mis ofertas/ }).click();
    await page.getByRole('row', { name: /Desarrollador Frontend Angular/ }).getByRole('button', { name: 'Ranking IA' }).click();

    await expect(page.getByRole('dialog')).toContainText('Laura Gómez — 92% de afinidad.');
    expect(api.llamadasA('GET', /^\/ia\/ranking-postulados\/101/)).toHaveLength(1);
  });
});
