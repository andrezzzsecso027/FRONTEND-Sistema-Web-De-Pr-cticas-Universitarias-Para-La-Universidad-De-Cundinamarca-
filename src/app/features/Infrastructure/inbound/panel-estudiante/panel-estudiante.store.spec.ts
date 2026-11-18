import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PanelEstudianteStore } from './panel-estudiante.store';
import { Estudiante, MiPractica } from '../../../../core/services/estudiante/estudiante';
import { OfertaService } from '../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { IaSeguridadService } from '../../../../core/services/ia-seguridad/ia-seguridad';
import { Auth } from '../../../../core/services/auth';

describe('PanelEstudianteStore', () => {
  let store: PanelEstudianteStore;
  let estudiante: Record<string, ReturnType<typeof vi.fn>>;
  let ofertas: Record<string, ReturnType<typeof vi.fn>>;
  let postulacion: Record<string, ReturnType<typeof vi.fn>>;
  let ia: Record<string, ReturnType<typeof vi.fn>>;

  const yo = { idUser: 1, document: '1001', name: 'Ana', lastName: 'Pérez', academicProgram: 'Sistemas' };
  const practica: MiPractica = { idPractice: 7, idPostulation: 3, practiceStatus: 'EN_CURSO', offerName: 'Backend' };

  beforeEach(() => {
    estudiante = {
      obtenerMiInformacion: vi.fn(() => of(yo)),
      obtenerPerfil: vi.fn(() => of({ documentStudent: '1001', skills: 'Java', aboutMe: 'Hola', linkLifesheet: 'cv.pdf' })),
      obtenerMisPostulaciones: vi.fn(() => of([{ idPostulation: 3, idOffer: 9, offerName: 'Backend', status: 'ACEPTADA', datePostulation: '' }])),
      obtenerMisPracticas: vi.fn(() => of([practica])),
      guardarPerfil: vi.fn((p) => of(p)),
      calificarEmpresa: vi.fn(() => of({}))
    };
    ofertas = { obtenerOfertasActivas: vi.fn(() => of([{ idOffer: 9, practiceName: 'Backend' }])) };
    postulacion = { aplicarAOferta: vi.fn(() => of({})) };
    ia = { recomendarOfertasEstudiante: vi.fn(() => of({ totalOffersAnalyzed: 4, aiRecommendation: 'Postúlate a Backend' })) };

    TestBed.configureTestingModule({
      providers: [
        PanelEstudianteStore,
        { provide: Estudiante, useValue: estudiante },
        { provide: OfertaService, useValue: ofertas },
        { provide: PostulacionService, useValue: postulacion },
        { provide: IaSeguridadService, useValue: ia },
        { provide: Auth, useValue: { getUsuarioActual: () => ({ email: 'ana@ucundinamarca.edu.co' }) } }
      ]
    });
    store = TestBed.inject(PanelEstudianteStore);
  });

  it('inicializar carga identidad, perfil, postulaciones, prácticas y ofertas', () => {
    store.inicializar();

    expect(store.documento()).toBe('1001');
    expect(store.nombreCompleto()).toBe('Ana Pérez');
    expect(store.iniciales()).toBe('AP');
    expect(store.correo()).toBe('ana@ucundinamarca.edu.co');
    expect(store.perfilCompleto()).toBe(true);
    expect(store.ofertas()).toHaveLength(1);
    expect(store.ofertasPostuladas().has(9)).toBe(true);
    expect(store.practicas()).toEqual([practica]);
    expect(store.practicaEnCurso()).toEqual(practica);
    expect(store.cargandoPracticas()).toBe(false);
  });

  it('sin identidad muestra el error y usa valores por defecto', () => {
    estudiante['obtenerMiInformacion'].mockReturnValue(throwError(() => new Error('401')));
    store.inicializar();
    expect(store.errorIdentidad()).toContain('No pudimos cargar');
    expect(store.nombreCompleto()).toBe('Estudiante');
    expect(store.iniciales()).toBe('E');
  });

  it('los errores al cargar dejan las listas vacías y el perfil mínimo', () => {
    ofertas['obtenerOfertasActivas'].mockReturnValue(throwError(() => new Error()));
    estudiante['obtenerMisPostulaciones'].mockReturnValue(throwError(() => new Error()));
    estudiante['obtenerMisPracticas'].mockReturnValue(throwError(() => new Error()));
    estudiante['obtenerPerfil'].mockReturnValue(throwError(() => new Error()));
    store.inicializar();

    expect(store.ofertas()).toEqual([]);
    expect(store.postulaciones()).toEqual([]);
    expect(store.practicas()).toEqual([]);
    expect(store.perfil()).toEqual({ documentStudent: '1001' });
    expect(store.perfilCompleto()).toBe(false);
  });

  describe('postularme', () => {
    it('pide esperar si aún no conoce la cédula', () => {
      store.postularme({ idOffer: 9, practiceName: 'Backend' } as never);
      expect(postulacion['aplicarAOferta']).not.toHaveBeenCalled();
      expect(store.mensajeError()).toContain('cargando');
    });

    it('postula con la cédula de la sesión y recarga las postulaciones', () => {
      store.inicializar();
      store.postularme({ idOffer: 9, practiceName: 'Backend' } as never);
      expect(postulacion['aplicarAOferta']).toHaveBeenCalledWith({ idOffer: 9, documentNumberStudent: '1001' });
      expect(store.mensajeExito()).toContain('Backend');
      expect(store.procesandoOfertaId()).toBeNull();
    });

    it('muestra el mensaje del backend si falla', () => {
      store.inicializar();
      postulacion['aplicarAOferta'].mockReturnValue(throwError(() => ({ error: 'Ya te postulaste' })));
      store.postularme({ idOffer: 9, practiceName: 'Backend' } as never);
      expect(store.mensajeError()).toBe('Ya te postulaste');
    });
  });

  describe('guardarPerfil', () => {
    it('no hace nada sin cédula', () => {
      store.guardarPerfil({ skills: 'Java' });
      expect(estudiante['guardarPerfil']).not.toHaveBeenCalled();
    });

    it('guarda y muestra el mensaje; si falla muestra el error', () => {
      store.inicializar();
      store.guardarPerfil({ skills: 'Angular' }, 'Listo');
      expect(store.perfil()?.skills).toBe('Angular');
      expect(store.mensajeExito()).toBe('Listo');

      estudiante['guardarPerfil'].mockReturnValue(throwError(() => ({})));
      store.guardarPerfil({ skills: 'X' });
      expect(store.mensajeError()).toBe('No se pudo guardar tu perfil.');
    });
  });

  describe('calificarEmpresa', () => {
    it('al guardar avisa, recarga las prácticas y confirma', () => {
      const alTerminar = vi.fn();
      store.calificarEmpresa({ idPractice: 7, companyRating: 5, commentText: 'Bien' }, alTerminar);
      expect(alTerminar).toHaveBeenCalledWith(true);
      expect(store.mensajeExito()).toContain('Gracias');
      expect(estudiante['obtenerMisPracticas']).toHaveBeenCalled();
      expect(store.enviandoCalificacion()).toBe(false);
    });

    it('si falla devuelve el mensaje del backend o uno genérico', () => {
      const alTerminar = vi.fn();
      estudiante['calificarEmpresa'].mockReturnValue(throwError(() => ({ error: 'Ya registraste una calificación' })));
      store.calificarEmpresa({ idPractice: 7, companyRating: 5, commentText: 'Bien' }, alTerminar);
      expect(alTerminar).toHaveBeenCalledWith(false, 'Ya registraste una calificación');

      estudiante['calificarEmpresa'].mockReturnValue(throwError(() => ({ error: null })));
      store.calificarEmpresa({ idPractice: 7, companyRating: 5, commentText: 'Bien' }, alTerminar);
      expect(alTerminar).toHaveBeenLastCalledWith(false, expect.stringContaining('No fue posible'));
    });
  });

  describe('recomendación con IA', () => {
    it('no abre sin cédula', () => {
      store.abrirRecomendacionIa();
      expect(store.recomendacionIa().abierto).toBe(false);
    });

    it('muestra el resultado y se puede cerrar', () => {
      store.inicializar();
      store.abrirRecomendacionIa();
      expect(store.recomendacionIa()).toMatchObject({ abierto: true, cargando: false, totalAnalizadas: 4, resultado: 'Postúlate a Backend' });
      store.cerrarRecomendacionIa();
      expect(store.recomendacionIa().abierto).toBe(false);
    });

    it('muestra un error si la IA no responde', () => {
      store.inicializar();
      ia['recomendarOfertasEstudiante'].mockReturnValue(throwError(() => new Error()));
      store.abrirRecomendacionIa();
      expect(store.recomendacionIa().error).toContain('asistente de IA');
    });
  });

  it('limpiarMensajes borra éxito y error', () => {
    store.mensajeExito.set('a');
    store.mensajeError.set('b');
    store.limpiarMensajes();
    expect(store.mensajeExito()).toBe('');
    expect(store.mensajeError()).toBe('');
  });
});
