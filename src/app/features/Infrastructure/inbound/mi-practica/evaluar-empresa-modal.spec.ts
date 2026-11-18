import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EvaluarEmpresaModal } from './evaluar-empresa-modal';
import { PanelEstudianteStore } from '../panel-estudiante/panel-estudiante.store';
import { MiPractica } from '../../../../core/services/estudiante/estudiante';

describe('EvaluarEmpresaModal', () => {
  const practica: MiPractica = {
    idPractice: 7, idPostulation: 1, practiceStatus: 'FINALIZADA', offerName: 'Backend', companyName: 'Nexus'
  };
  let calificarEmpresa: ReturnType<typeof vi.fn>;

  const crear = () => {
    const fixture = TestBed.createComponent(EvaluarEmpresaModal);
    fixture.componentRef.setInput('practica', practica);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    calificarEmpresa = vi.fn();
    TestBed.configureTestingModule({
      imports: [EvaluarEmpresaModal],
      providers: [{ provide: PanelEstudianteStore, useValue: { calificarEmpresa, enviandoCalificacion: signal(false) } }]
    });
  });

  it('no envía sin estrellas o sin comentario', () => {
    const modal = crear().componentInstance as any;
    modal.enviar();
    expect(calificarEmpresa).not.toHaveBeenCalled();
    expect(modal.error()).toContain('estrellas');

    modal.calificacion.set(4);
    modal.comentario = '   ';
    modal.enviar();
    expect(calificarEmpresa).not.toHaveBeenCalled();
  });

  it('envía la calificación y cierra el modal si el backend la acepta', () => {
    const fixture = crear();
    const modal = fixture.componentInstance as any;
    const cerrar = vi.fn();
    modal.cerrar.subscribe(cerrar);

    modal.calificacion.set(5);
    modal.comentario = '  Excelente acompañamiento  ';
    modal.enviar();

    expect(calificarEmpresa).toHaveBeenCalledWith(
      { idPractice: 7, companyRating: 5, commentText: 'Excelente acompañamiento' }, expect.any(Function));
    calificarEmpresa.mock.calls[0][1](true);
    expect(cerrar).toHaveBeenCalled();
  });

  it('muestra el error del backend y no cierra', () => {
    const modal = crear().componentInstance as any;
    const cerrar = vi.fn();
    modal.cerrar.subscribe(cerrar);
    modal.calificacion.set(3);
    modal.comentario = 'Regular';
    modal.enviar();

    calificarEmpresa.mock.calls[0][1](false, 'Ya registraste una calificación para esta práctica.');
    expect(modal.error()).toBe('Ya registraste una calificación para esta práctica.');
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('las flechas del teclado cambian la calificación entre 1 y 5', () => {
    const modal = crear().componentInstance as any;
    const tecla = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;
    modal.moverConTeclado(tecla('ArrowRight'));
    expect(modal.calificacion()).toBe(1);
    for (let i = 0; i < 6; i++) modal.moverConTeclado(tecla('ArrowUp'));
    expect(modal.calificacion()).toBe(5);
    modal.moverConTeclado(tecla('ArrowLeft'));
    expect(modal.calificacion()).toBe(4);
    modal.moverConTeclado(tecla('Enter'));
    expect(modal.calificacion()).toBe(4);
    expect(modal.etiqueta(4)).toBe('Buena');
  });
});
