/**
 * Funciones puras del panel de administración (sin estado ni dependencias de Angular).
 * Se usan desde el store y desde las vistas para filtrar y normalizar textos.
 */

export function normalizarTextoSinTildes(texto?: string): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/,/g, '')
    .toLowerCase()
    .trim();
}

/** Compara programas académicos tolerando tildes y variantes de nombre ("Agronómica" vs "Agronomía"...). */
export function coincideProgramaAcademico(programaEstudiante: string, programaFiltro: string): boolean {
  const est = normalizarTextoSinTildes(programaEstudiante);
  const filtro = normalizarTextoSinTildes(programaFiltro);
  if (est === filtro) return true;
  if (filtro.includes('agronomica') && est.includes('agron')) return true;
  if (filtro.includes('zootecnia') && est.includes('zootec')) return true;
  if (filtro.includes('industrial') && est.includes('industrial')) return true;
  if (filtro.includes('sociales') && est.includes('sociales')) return true;
  if (filtro.includes('educacion fisica') && est.includes('fisica')) return true;
  return false;
}

/** Normaliza el tipo de sociedad ("S.A.S.", "sas", "Limitada"...) a un código del catálogo. */
export function normalizarCodigoTipoEmpresa(tipo?: string): string {
  if (!tipo) return 'SAS';
  const limpio = tipo.toUpperCase().replace(/\./g, '').trim();
  if (limpio.includes('SAS')) return 'SAS';
  if (limpio.includes('LTDA') || limpio.includes('LIMITADA')) return 'LTDA';
  if (limpio === 'SA' || limpio.includes('ANONIMA')) return 'SA';
  if (limpio.includes('ESAL') || limpio.includes('FUNDACION') || limpio.includes('ONG')) return 'ESAL';
  if (limpio.includes('PUBLICA') || limpio.includes('ESTADO')) return 'PUBLICA';
  return tipo.toUpperCase().trim();
}

/** ACTIVA / CERRADA / ... a partir del estado (booleano o texto) y los cupos de la oferta. */
export function obtenerEstadoNormalizadoOferta(of: any): string {
  const raw = of?.statusOffer ?? of?.offerStatus ?? of?.estadoOferta;
  if (typeof raw === 'boolean') {
    return raw && (of?.availableSpots ?? 0) > 0 ? 'ACTIVA' : 'CERRADA';
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().toUpperCase();
  }
  return (of?.availableSpots ?? 0) > 0 ? 'ACTIVA' : 'CERRADA';
}

/** Pagina una lista (página base 1). */
export function paginar<T>(lista: T[], pagina: number, porPagina: number): T[] {
  const inicio = (pagina - 1) * porPagina;
  return lista.slice(inicio, inicio + porPagina);
}

export function totalPaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}
