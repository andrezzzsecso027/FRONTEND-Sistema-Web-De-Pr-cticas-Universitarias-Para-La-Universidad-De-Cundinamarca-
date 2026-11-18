import { MiPractica } from '../../../../core/services/estudiante/estudiante';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Convierte 'yyyy-MM-dd' (LocalDate) o un ISO con hora a fecha local, sin desfase por zona horaria. */
export function aFecha(valor?: string | null): Date | null {
  if (!valor) return null;
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (soloFecha) return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function inicioDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

export interface ProgresoPractica {
  /** Días transcurridos (0 si aún no empieza). */
  transcurridos: number;
  totales: number;
  restantes: number;
  /** 0–100 */
  porcentaje: number;
  /** 'por-iniciar' | 'en-curso' | 'terminada' según las fechas. */
  fase: 'por-iniciar' | 'en-curso' | 'terminada';
}

/** Avance de la práctica según sus fechas; null si la empresa aún no registró inicio y fin. */
export function calcularProgreso(practica: MiPractica, hoy = new Date()): ProgresoPractica | null {
  const inicio = aFecha(practica.startDate);
  const fin = aFecha(practica.endDate);
  if (!inicio || !fin) return null;

  const totales = Math.max(1, Math.round((inicioDelDia(fin) - inicioDelDia(inicio)) / DIA_MS));
  const desdeInicio = Math.round((inicioDelDia(hoy) - inicioDelDia(inicio)) / DIA_MS);
  const transcurridos = Math.min(totales, Math.max(0, desdeInicio));
  const finalizada = practica.practiceStatus === 'FINALIZADA';

  let fase: ProgresoPractica['fase'] = 'en-curso';
  if (finalizada || desdeInicio >= totales) fase = 'terminada';
  else if (desdeInicio < 0) fase = 'por-iniciar';

  return {
    transcurridos: finalizada ? totales : transcurridos,
    totales,
    restantes: finalizada ? 0 : totales - transcurridos,
    porcentaje: finalizada ? 100 : Math.round((transcurridos / totales) * 100),
    fase
  };
}

export type EstadoPaso = 'hecho' | 'actual' | 'pendiente';

export interface PasoSeguimiento {
  titulo: string;
  detalle: string;
  fecha: Date | null;
  estado: EstadoPaso;
}

/**
 * Línea de tiempo de la práctica:
 * Postulación → Aceptada → Contrato firmado → En curso → Finalizada.
 * Los pasos cumplidos quedan "hecho" y el primero sin cumplir queda "actual".
 */
export function construirSeguimiento(practica: MiPractica, hoy = new Date()): PasoSeguimiento[] {
  const contratoFirmado = !!practica.contract
    && (practica.contract.trackingStatus === 'CONTRATO_FIRMADO' || practica.contract.trackingStatus === 'FINALIZADA');
  const inicio = aFecha(practica.startDate);
  const finalizada = practica.practiceStatus === 'FINALIZADA';
  const empezo = finalizada || (!!inicio && inicioDelDia(inicio) <= inicioDelDia(hoy));

  const pasos: Array<Omit<PasoSeguimiento, 'estado'> & { cumplido: boolean }> = [
    { titulo: 'Postulación enviada', detalle: 'Te postulaste a la oferta.', fecha: aFecha(practica.datePostulation), cumplido: true },
    { titulo: 'Aceptado por la empresa', detalle: `${practica.companyName || 'La empresa'} aprobó tu postulación.`, fecha: aFecha(practica.dateAccepted), cumplido: true },
    {
      titulo: 'Contrato firmado',
      detalle: contratoFirmado ? 'La empresa cargó tu contrato de práctica.' : 'La empresa debe cargar el contrato firmado.',
      fecha: contratoFirmado ? aFecha(practica.contract?.uploadDate) : null,
      cumplido: contratoFirmado
    },
    {
      titulo: 'Práctica en curso',
      detalle: inicio ? 'Fecha de inicio registrada por la empresa.' : 'La empresa aún no registra la fecha de inicio.',
      fecha: inicio,
      cumplido: empezo
    },
    {
      titulo: 'Práctica finalizada',
      detalle: finalizada ? 'Ya puedes evaluar a la empresa.' : 'La empresa marca la práctica como finalizada al terminar.',
      fecha: aFecha(practica.endDate),
      cumplido: finalizada
    }
  ];

  let actualAsignado = false;
  return pasos.map(({ cumplido, ...paso }) => {
    if (cumplido) return { ...paso, estado: 'hecho' as const };
    if (!actualAsignado) {
      actualAsignado = true;
      return { ...paso, estado: 'actual' as const };
    }
    return { ...paso, estado: 'pendiente' as const };
  });
}
