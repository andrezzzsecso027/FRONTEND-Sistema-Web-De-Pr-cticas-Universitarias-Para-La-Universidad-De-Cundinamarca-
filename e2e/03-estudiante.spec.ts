import { test, expect } from '@playwright/test';
import {
  ApiSimulada, sembrarSesion, ESTUDIANTE_ACTUAL, PERFIL_COMPLETO, OFERTAS, DOC_ESTUDIANTE
} from './support/api-mock';

/**
 * Portal del estudiante: catálogo de ofertas, postulación, seguimiento de postulaciones,
 * recomendación con IA y evaluación de la empresa al finalizar la práctica.
 */
test.describe('Portal del estudiante', () => {
  let api: ApiSimulada;
  let postulaciones: any[];
  let practicas: any[];

  test.beforeEach(async ({ page }) => {
    postulaciones = [];
    practicas = [];
    api = new ApiSimulada()
      .get(/^\/estudiantes\/me$/, { json: ESTUDIANTE_ACTUAL })
      .get(/^\/registro\/estudiantes\/perfil\//, { json: PERFIL_COMPLETO })
      .get(/^\/ofertas\/estudiantes/, { json: OFERTAS })
      .get(/^\/estudiantes\/me\/postulaciones/, () => ({ json: postulaciones }))
      .get(/^\/estudiantes\/me\/practicas/, () => ({ json: practicas }));
    await api.instalar(page);
    await sembrarSesion(page, 'estudiante');
  });

  test('E2E-EST-01 · lista las ofertas abiertas y filtra por texto y modalidad', async ({ page }) => {
    await page.goto('/ofertas');

    await expect(page.getByRole('heading', { name: 'Ofertas de práctica' })).toBeVisible();
    await expect(page.getByText('2 oferta(s)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Desarrollador Frontend Angular' })).toBeVisible();
    await expect(page.getByText('Sin apoyo económico')).toBeVisible();

    await page.getByPlaceholder('Buscar por cargo, programa o ciudad').fill('contable');
    await expect(page.getByText('1 oferta(s)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Auxiliar contable' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Desarrollador Frontend Angular' })).toBeHidden();

    await page.getByPlaceholder('Buscar por cargo, programa o ciudad').fill('');
    await page.getByLabel('Modalidad').selectOption('Remoto');
    await expect(page.getByText('1 oferta(s)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Desarrollador Frontend Angular' })).toBeVisible();

    await page.getByLabel('Modalidad').selectOption('Híbrido');
    await expect(page.getByText('Sin resultados')).toBeVisible();
  });

  test('E2E-EST-02 · se postula a una oferta con su cédula y ya no puede repetirla', async ({ page }) => {
    api.post(/^\/postulaciones\/aplicar/, (req) => {
      const { idOffer } = req.postDataJSON();
      const oferta = OFERTAS.find(o => o.idOffer === idOffer)!;
      postulaciones.push({
        idPostulation: 501, idOffer, offerName: oferta.practiceName, modality: oferta.modality,
        location: oferta.location, companyName: 'TechAndes SAS', status: 'POSTULADA',
        datePostulation: '2026-11-18T10:00:00'
      });
      return { status: 201, json: { idPostulation: 501 } };
    });

    await page.goto('/ofertas');
    const tarjeta = page.locator('article', { hasText: 'Desarrollador Frontend Angular' });
    await tarjeta.getByRole('button', { name: 'Postularme' }).click();

    await expect(page.getByRole('status')).toContainText('Te postulaste a «Desarrollador Frontend Angular»');
    await expect(tarjeta.getByRole('button', { name: 'Ya te postulaste' })).toBeDisabled();
    expect(api.llamadasA('POST', /^\/postulaciones\/aplicar/)[0].body).toEqual({
      idOffer: 101,
      documentNumberStudent: DOC_ESTUDIANTE
    });

    await page.getByRole('link', { name: /Mis postulaciones/ }).click();
    await expect(page).toHaveURL(/\/mis-postulaciones$/);
    const fila = page.getByRole('row', { name: /Desarrollador Frontend Angular/ });
    await expect(fila).toContainText('TechAndes SAS');
    await expect(fila).toContainText('En revisión');
  });

  test('E2E-EST-03 · si el backend rechaza la postulación se muestra su mensaje', async ({ page }) => {
    api.post(/^\/postulaciones\/aplicar/, { status: 409, text: 'Ya tienes una práctica en curso.' });

    await page.goto('/ofertas');
    await page.locator('article', { hasText: 'Auxiliar contable' }).getByRole('button', { name: 'Postularme' }).click();

    await expect(page.getByRole('alert')).toContainText('Ya tienes una práctica en curso.');
  });

  test('E2E-EST-04 · ve el estado y el mensaje de la empresa en sus postulaciones', async ({ page }) => {
    postulaciones.push(
      { idPostulation: 1, idOffer: 101, offerName: 'Desarrollador Frontend Angular', companyName: 'TechAndes SAS',
        status: 'ACEPTADA', datePostulation: '2026-11-01', observations: 'Te esperamos el lunes para la inducción.' },
      { idPostulation: 2, idOffer: 102, offerName: 'Auxiliar contable', companyName: 'Contables SAS',
        status: 'RECHAZADA', datePostulation: '2026-11-02' }
    );
    await page.goto('/mis-postulaciones');

    const aceptada = page.getByRole('row', { name: /Desarrollador Frontend Angular/ });
    await expect(aceptada).toContainText('Aceptada');
    await expect(aceptada).toContainText('Te esperamos el lunes para la inducción.');
    await expect(page.getByRole('row', { name: /Auxiliar contable/ })).toContainText('No seleccionada');

    await aceptada.getByRole('link', { name: 'Ver seguimiento' }).click();
    await expect(page).toHaveURL(/\/mi-practica$/);
  });

  test('E2E-EST-05 · recomendación de ofertas con IA según su perfil', async ({ page }) => {
    api.get(/^\/ia\/recomendar-ofertas\//, {
      json: { totalOffersAnalyzed: 2, aiRecommendation: '1. Desarrollador Frontend Angular — afinidad alta con Angular y TypeScript.' }
    });
    await page.goto('/ofertas');

    await page.getByRole('button', { name: 'Recomendar según mi perfil' }).click();

    const modal = page.getByRole('dialog', { name: 'Ofertas recomendadas para ti' });
    await expect(modal).toContainText('Ofertas analizadas: 2');
    await expect(modal).toContainText('afinidad alta con Angular');
    expect(api.llamadasA('GET', /^\/ia\/recomendar-ofertas\//)[0].path).toContain(DOC_ESTUDIANTE);

    await modal.getByRole('button', { name: 'Cerrar' }).last().click();
    await expect(modal).toBeHidden();
  });

  test('E2E-EST-05b · las recomendaciones enlazan a la oferta: vista previa al pasar el ratón y clic para ir', async ({ page }) => {
    api.get(/^\/ia\/recomendar-ofertas\//, {
      json: {
        totalOffersAnalyzed: 500, aiPowered: true, aiRecommendation: '…',
        recommendations: [
          { idOffer: 101, practiceName: 'Desarrollador Frontend Angular', match: 92, reason: 'Domina Angular y TypeScript, igual que pide el cargo.' },
          { idOffer: 102, practiceName: 'Auxiliar contable', match: 41, reason: 'Poca relación con su perfil técnico.' },
          { idOffer: 999, practiceName: 'Oferta ya cerrada', match: 30, reason: 'Ya no está publicada.' }
        ]
      }
    });
    await page.goto('/ofertas');
    // Un filtro activo que oculta la oferta recomendada: al ir a ella se debe limpiar.
    await page.getByPlaceholder('Buscar por cargo, programa o ciudad').fill('contable');
    await expect(page.getByRole('heading', { name: 'Desarrollador Frontend Angular' })).toBeHidden();

    await page.getByRole('button', { name: 'Recomendar según mi perfil' }).click();
    const modal = page.getByRole('dialog', { name: 'Ofertas recomendadas para ti' });
    const lista = modal.getByRole('list', { name: 'Ofertas recomendadas' });

    await expect(lista.getByRole('listitem')).toHaveCount(3);
    await expect(lista.getByRole('button', { name: /Oferta ya cerrada.*Ya no está disponible/ })).toBeDisabled();

    // Vista previa: por defecto la primera; al pasar el ratón cambia a la oferta bajo el cursor.
    const vistaPrevia = modal.locator('aside');
    await expect(vistaPrevia).toContainText('Desarrollador Frontend Angular');
    await lista.getByRole('button', { name: /Auxiliar contable, 41%/ }).hover();
    await expect(vistaPrevia).toContainText('Conciliaciones bancarias');
    await expect(vistaPrevia).toContainText('Sin apoyo económico');

    // Clic: cierra el modal, quita el filtro y resalta la oferta.
    await lista.getByRole('button', { name: /Desarrollador Frontend Angular, 92%/ }).click();
    await expect(modal).toBeHidden();
    const tarjeta = page.locator('#oferta-101');
    await expect(tarjeta).toHaveAttribute('aria-current', 'true');
    await expect(tarjeta).toBeInViewport();
    await expect(page.getByPlaceholder('Buscar por cargo, programa o ciudad')).toHaveValue('');
    await expect(tarjeta.getByRole('button', { name: 'Postularme' })).toBeEnabled();
    // El resaltado es temporal.
    await expect(tarjeta).not.toHaveAttribute('aria-current', 'true', { timeout: 6000 });
  });

  test('E2E-EST-06 · sin práctica aún, "Mi práctica" muestra el estado vacío', async ({ page }) => {
    await page.goto('/mi-practica');
    await expect(page.getByText('Aún no tienes una práctica')).toBeVisible();
  });

  test('E2E-EST-07 · práctica en curso: progreso, contrato y evaluación bloqueada', async ({ page }) => {
    practicas.push({
      idPractice: 7, idPostulation: 1, practiceStatus: 'EN_CURSO',
      startDate: '2026-08-01', endDate: '2027-01-31',
      offerName: 'Desarrollador Frontend Angular', companyName: 'TechAndes SAS', modality: 'Remoto',
      contract: { trackingStatus: 'CONTRATO_FIRMADO', fileName: 'contrato-laura.pdf',
        fileUrl: 'https://res.cloudinary.com/udecprac/raw/upload/contrato-laura.pdf', uploadDate: '2026-08-02' }
    });
    await page.goto('/mi-practica');

    await expect(page.getByRole('heading', { name: 'Desarrollador Frontend Angular' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Avance de la práctica' })).toBeVisible();
    await expect(page.getByText('contrato-laura.pdf')).toBeVisible();
    await expect(page.getByText('Podrás calificar a la empresa cuando tu práctica sea marcada como finalizada.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Evaluar empresa' })).toHaveCount(0);
  });

  test('E2E-EST-08 · práctica finalizada: evalúa a la empresa (1–5 estrellas) y queda en moderación', async ({ page }) => {
    practicas.push({
      idPractice: 7, idPostulation: 1, practiceStatus: 'FINALIZADA',
      startDate: '2026-02-01', endDate: '2026-07-31',
      offerName: 'Desarrollador Frontend Angular', companyName: 'TechAndes SAS',
      companyFeedback: 'Excelente compromiso y aprendizaje rápido.'
    });
    api.post(/^\/comentarios\/crear/, (req) => {
      const { companyRating, commentText } = req.postDataJSON();
      practicas[0] = { ...practicas[0], evaluation: { companyRating, commentText, validationStatus: 'PENDIENTE' } };
      return { status: 201, json: { idComment: 1 } };
    });
    await page.goto('/mi-practica');

    await expect(page.getByText('Excelente compromiso y aprendizaje rápido.')).toBeVisible();
    await page.getByRole('button', { name: 'Evaluar empresa' }).click();

    const modal = page.getByRole('dialog', { name: 'Evaluar a TechAndes SAS' });
    const enviar = modal.getByRole('button', { name: 'Enviar evaluación' });
    await expect(enviar).toBeDisabled();

    await modal.getByRole('radio', { name: /^4 estrellas/ }).click();
    await expect(enviar).toBeDisabled(); // falta el comentario
    await modal.getByLabel('Comentario').fill('Buen acompañamiento del tutor y proyectos reales.');
    await expect(enviar).toBeEnabled();
    await enviar.click();

    await expect(modal).toBeHidden();
    await expect(page.getByRole('status')).toContainText('Gracias por tu evaluación');
    await expect(page.getByText('En revisión por un administrador')).toBeVisible();
    expect(api.llamadasA('POST', /^\/comentarios\/crear/)[0].body).toEqual({
      idPractice: 7,
      companyRating: 4,
      commentText: 'Buen acompañamiento del tutor y proyectos reales.'
    });
  });
});
