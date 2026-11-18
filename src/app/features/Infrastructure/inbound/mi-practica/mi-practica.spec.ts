import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MiPracticaVista } from './mi-practica';
import { PanelEstudianteStore } from '../panel-estudiante/panel-estudiante.store';
import { MiPractica } from '../../../../core/services/estudiante/estudiante';

describe('MiPracticaVista', () => {
  const practicas = signal<MiPractica[]>([]);
  const cargandoPracticas = signal(false);

  const render = () => {
    const fixture = TestBed.createComponent(MiPracticaVista);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    practicas.set([]);
    cargandoPracticas.set(false);
    TestBed.configureTestingModule({
      imports: [MiPracticaVista],
      providers: [
        provideRouter([]),
        {
          provide: PanelEstudianteStore,
          useValue: {
            practicas, cargandoPracticas,
            enviandoCalificacion: signal(false),
            practicaEnCurso: computed(() => null),
            cargarPracticas: vi.fn(),
            calificarEmpresa: vi.fn()
          }
        }
      ]
    });
  });

  it('muestra el estado vacío si el estudiante no tiene práctica', () => {
    expect(render().textContent).toContain('Aún no tienes una práctica');
  });

  it('en curso: muestra la práctica y explica que aún no puede evaluar', () => {
    practicas.set([{ idPractice: 1, idPostulation: 1, practiceStatus: 'EN_CURSO', offerName: 'Practicante backend', companyName: 'Nexus' }]);
    const html = render().textContent ?? '';
    expect(html).toContain('Practicante backend');
    expect(html).toContain('Podrás calificar a la empresa');
    expect(html).not.toContain('Evaluar empresa');
  });

  it('finalizada sin evaluación: ofrece el botón "Evaluar empresa"', () => {
    practicas.set([{ idPractice: 1, idPostulation: 1, practiceStatus: 'FINALIZADA', offerName: 'Backend' }]);
    expect(render().textContent).toContain('Evaluar empresa');
  });

  it('con evaluación: muestra el comentario y su estado de moderación', () => {
    practicas.set([{
      idPractice: 1, idPostulation: 1, practiceStatus: 'FINALIZADA', offerName: 'Backend',
      evaluation: { companyRating: 4, commentText: 'Gran equipo', validationStatus: 'PENDIENTE' }
    }]);
    const html = render().textContent ?? '';
    expect(html).toContain('Gran equipo');
    expect(html).toContain('En revisión por un administrador');
  });
});
