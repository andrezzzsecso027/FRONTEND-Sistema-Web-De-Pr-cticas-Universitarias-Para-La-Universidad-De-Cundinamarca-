import { MiPractica } from '../../../../core/services/estudiante/estudiante';
import { aFecha, calcularProgreso, construirSeguimiento } from './mi-practica.util';

const base = (cambios: Partial<MiPractica> = {}): MiPractica => ({
  idPractice: 1,
  idPostulation: 10,
  practiceStatus: 'EN_CURSO',
  offerName: 'Practicante backend',
  companyName: 'Nexus',
  datePostulation: '2026-01-05T10:00:00',
  dateAccepted: '2026-01-10T10:00:00',
  ...cambios
});

describe('mi-practica.util', () => {
  describe('aFecha', () => {
    it('interpreta yyyy-MM-dd como fecha local (sin correrse un día)', () => {
      const f = aFecha('2026-03-01')!;
      expect([f.getFullYear(), f.getMonth(), f.getDate()]).toEqual([2026, 2, 1]);
    });

    it('devuelve null para valores vacíos o inválidos', () => {
      expect(aFecha(undefined)).toBeNull();
      expect(aFecha('')).toBeNull();
      expect(aFecha('no-es-fecha')).toBeNull();
    });
  });

  describe('calcularProgreso', () => {
    const hoy = new Date(2026, 2, 11); // 11 mar 2026

    it('es null si la empresa no registró fechas', () => {
      expect(calcularProgreso(base(), hoy)).toBeNull();
    });

    it('calcula días transcurridos, restantes y porcentaje en curso', () => {
      const p = calcularProgreso(base({ startDate: '2026-03-01', endDate: '2026-03-21' }), hoy)!;
      expect(p).toEqual({ transcurridos: 10, totales: 20, restantes: 10, porcentaje: 50, fase: 'en-curso' });
    });

    it('marca "por-iniciar" antes de la fecha de inicio', () => {
      const p = calcularProgreso(base({ startDate: '2026-04-01', endDate: '2026-06-01' }), hoy)!;
      expect(p.fase).toBe('por-iniciar');
      expect(p.porcentaje).toBe(0);
    });

    it('una práctica FINALIZADA siempre está al 100 %', () => {
      const p = calcularProgreso(base({ practiceStatus: 'FINALIZADA', startDate: '2026-03-01', endDate: '2026-12-01' }), hoy)!;
      expect(p).toMatchObject({ porcentaje: 100, restantes: 0, fase: 'terminada' });
    });
  });

  describe('construirSeguimiento', () => {
    const hoy = new Date(2026, 2, 11);

    it('sin contrato: el contrato es el paso actual y lo demás queda pendiente', () => {
      const pasos = construirSeguimiento(base(), hoy);
      expect(pasos.map(p => p.estado)).toEqual(['hecho', 'hecho', 'actual', 'pendiente', 'pendiente']);
    });

    it('con contrato firmado y fecha de inicio pasada: el paso actual es la finalización', () => {
      const pasos = construirSeguimiento(base({
        startDate: '2026-03-01',
        contract: { trackingStatus: 'CONTRATO_FIRMADO', uploadDate: '2026-02-20T09:00:00' }
      }), hoy);
      expect(pasos.map(p => p.estado)).toEqual(['hecho', 'hecho', 'hecho', 'hecho', 'actual']);
      expect(pasos[2].fecha).not.toBeNull();
    });

    it('práctica finalizada: todos los pasos hechos menos el contrato si nunca se cargó', () => {
      const pasos = construirSeguimiento(base({ practiceStatus: 'FINALIZADA' }), hoy);
      expect(pasos.map(p => p.estado)).toEqual(['hecho', 'hecho', 'actual', 'hecho', 'hecho']);
    });
  });
});
