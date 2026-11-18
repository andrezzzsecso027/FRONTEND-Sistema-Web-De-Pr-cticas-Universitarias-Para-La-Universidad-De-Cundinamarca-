import { test, expect } from '@playwright/test';
import { ApiSimulada, sembrarSesion, EMPRESA_APROBADA, OFERTAS } from './support/api-mock';

/**
 * Panel de coordinación (administrador): aprobación de empresas (requiere el certificado
 * RUT/NIT en PDF) y moderación de las reseñas que los estudiantes hacen de las empresas.
 */
test.describe('Panel de administrador', () => {
  let api: ApiSimulada;
  let empresas: any[];
  let comentarios: any[];

  test.beforeEach(async ({ page }) => {
    empresas = [
      EMPRESA_APROBADA,
      { idUser: 10, nit: '901555444-1', companyName: 'AgroSumapaz SAS', companyType: 'SAS', city: 'Fusagasugá',
        verificationStatus: 'PENDIENTE', rutPdfUrl: 'https://res.cloudinary.com/udecprac/raw/upload/rut-agro.pdf' },
      { idUser: 11, nit: '901777888-2', companyName: 'Sin Papeles Ltda', companyType: 'LTDA', city: 'Girardot',
        verificationStatus: 'PENDIENTE' }
    ];
    comentarios = [
      { idComment: 31, idPractice: 7, nitCompany: EMPRESA_APROBADA.nit, studentName: 'Laura Gómez',
        content: 'Buen acompañamiento del tutor y proyectos reales.', rating: 4 }
    ];
    api = new ApiSimulada()
      .get(/^\/admin\/empresas\/todas/, () => ({ json: empresas }))
      .get(/^\/admin\/ofertas/, { json: OFERTAS })
      .get(/^\/admin\/comentarios\/pendientes/, () => ({ json: comentarios }))
      .put(/^\/admin\/empresas\/[^/]+\/verificar/, (req, url) => {
        const nit = decodeURIComponent(url.pathname.split('/').at(-2)!);
        const { aprobada } = req.postDataJSON();
        empresas = empresas.map(e => e.nit === nit ? { ...e, verificationStatus: aprobada ? 'APROBADA' : 'RECHAZADA' } : e);
        return { text: aprobada ? 'Empresa aprobada correctamente.' : 'Empresa rechazada.' };
      })
      .patch(/^\/admin\/comentarios\/\d+\/moderar/, (_req, url) => {
        const id = Number(url.pathname.split('/').at(-2));
        comentarios = comentarios.filter(c => c.idComment !== id);
        return { text: '' };
      });
    await api.instalar(page);
    await sembrarSesion(page, 'administrador');
    await page.goto('/panel-administrador');
  });

  test('E2E-ADM-01 · lista las empresas por aprobar y bloquea las que no tienen certificado NIT', async ({ page }) => {
    const agro = page.getByRole('row', { name: /AgroSumapaz SAS/ });
    const sinPapeles = page.getByRole('row', { name: /Sin Papeles Ltda/ });

    await expect(agro).toContainText('Pendiente');
    await expect(agro.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
    await expect(sinPapeles).toContainText('Sin certificado');
    await expect(sinPapeles.getByRole('button', { name: 'Aprobar' })).toBeDisabled();
    // La empresa ya aprobada no está en la bandeja de pendientes.
    await expect(page.getByRole('row', { name: /TechAndes SAS/ })).toHaveCount(0);
  });

  test('E2E-ADM-02 · aprueba una empresa y pasa a "Aprobadas"', async ({ page }) => {
    await page.getByRole('row', { name: /AgroSumapaz SAS/ }).getByRole('button', { name: 'Aprobar' }).click();

    await expect(page.getByRole('status')).toContainText('Empresa aprobada correctamente.');
    await expect(page.getByRole('row', { name: /AgroSumapaz SAS/ })).toHaveCount(0);
    expect(api.llamadasA('PUT', /^\/admin\/empresas\/901555444-1\/verificar/)[0].body).toEqual({ aprobada: true });

    await page.getByRole('navigation').getByRole('button', { name: /Aprobadas/ }).click();
    await expect(page.getByText('AgroSumapaz SAS').first()).toBeVisible();
  });

  test('E2E-ADM-03 · rechaza una empresa sin certificado', async ({ page }) => {
    await page.getByRole('row', { name: /Sin Papeles Ltda/ }).getByRole('button', { name: 'Rechazar' }).click();

    await expect(page.getByRole('status')).toContainText('Empresa rechazada.');
    await expect(page.getByRole('row', { name: /Sin Papeles Ltda/ })).toHaveCount(0);
    expect(api.llamadasA('PUT', /^\/admin\/empresas\/901777888-2\/verificar/)[0].body).toEqual({ aprobada: false });
  });

  test('E2E-ADM-04 · publica una reseña pendiente de moderación', async ({ page }) => {
    await page.getByRole('navigation').getByRole('button', { name: /Reseñas/ }).click();

    const fila = page.getByRole('row', { name: /Laura Gómez/ });
    await expect(fila).toContainText('TechAndes SAS');
    await expect(fila).toContainText('4 / 5');
    await fila.getByRole('button', { name: 'Publicar' }).click();

    await expect(page.getByRole('status')).toContainText('Comentario aprobado y publicado.');
    await expect(page.getByText('No hay reseñas por moderar')).toBeVisible();
    expect(api.llamadasA('PATCH', /^\/admin\/comentarios\/31\/moderar\?aprobado=true/)).toHaveLength(1);
  });

  test('E2E-ADM-05 · ve todas las ofertas publicadas', async ({ page }) => {
    await page.getByRole('navigation').getByRole('button', { name: /Ofertas/ }).click();
    await expect(page.getByText('Desarrollador Frontend Angular').first()).toBeVisible();
    await expect(page.getByText('Auxiliar contable').first()).toBeVisible();
  });
});
