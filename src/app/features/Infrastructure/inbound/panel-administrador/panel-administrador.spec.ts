import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PanelAdministrador } from './panel-administrador';
import { PanelAdminStore } from './panel-administrador.store';
import { AdminOfertas } from './components/admin-ofertas/admin-ofertas';
import { AdminEmpresas } from './components/admin-empresas/admin-empresas';
import { AdminEstudiantes } from './components/admin-estudiantes/admin-estudiantes';
import { coincideProgramaAcademico, normalizarCodigoTipoEmpresa, paginar, totalPaginas } from './panel-administrador.utils';
import { Admin, Company, OfferAdminDTO, PracticeAdminDTO, CommentAdminDTO } from '../../../../core/services/admin/admin';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';

describe('PanelAdministrador (shell + store + vistas)', () => {
  let fixture: ComponentFixture<PanelAdministrador>;
  let store: PanelAdminStore;

  const mockEmpresas: Company[] = [
    { nit: '900111222-3', companyName: 'Empresa Pendiente SAS', companyType: 'SAS', city: 'Fusagasugá', verificationStatus: 'PENDIENTE' },
    { nit: '901234567-8', companyName: 'Tech Solutions', companyType: 'S.A.S.', city: 'Fusagasugá', verificationStatus: 'APROBADA' },
    { nit: '966625556-7', companyName: 'Antojos del Negro', companyType: 'SAS', city: 'Chía', verificationStatus: 'APROBADA' }
  ];

  const mockEstudiantes: any[] = [
    { document: '1003558974', name: 'Brayan', lastName: 'Alfaro', headquarters: 'Fusagasugá', academicProgram: 'Ingeniería de Sistemas y Computación' }
  ];

  const mockOfertas: OfferAdminDTO[] = [
    {
      idOffer: 1, practiceName: 'Desarrollador Backend Junior', practiceDescription: 'Desarrollo en Spring Boot',
      profession: 'Ingeniería de Sistemas', modality: 'Remoto', salary: 1300000, location: 'Fusagasugá',
      availableSpots: 0, nitCompanyAssociated: '901234567-8', statusOffer: true
    },
    {
      idOffer: 4, practiceName: 'Contador Público', practiceDescription: 'Apoyo contable',
      profession: 'Contaduría Pública', modality: 'Presencial', salary: 1000000, location: 'Fusagasugá',
      availableSpots: 2, nitCompanyAssociated: '966625556-7', statusOffer: true
    }
  ];

  const mockPracticas: PracticeAdminDTO[] = [
    { idPractice: 1, idPostulation: 10, studentDocument: '1003558974', idOffer: 1, statusPractice: 'EN_CURSO' }
  ];

  const mockComentarios: CommentAdminDTO[] = [
    { idComment: 5, idPractice: 1, nitCompany: '901234567-8', studentName: 'Brayan', content: 'Excelente', rating: 5, status: 'PENDIENTE' }
  ];

  const adminServiceMock = {
    obtenerTodasLasEmpresas: vi.fn(() => of(mockEmpresas)),
    obtenerEstudiantes: () => of(mockEstudiantes),
    obtenerPerfilEstudiante: () => of({
      documentStudent: '1003558974', skills: 'Java, Spring Boot, Angular', englishLevel: 'B2',
      linkLifesheet: 'https://res.cloudinary.com/demo/cv.pdf'
    }),
    obtenerTodasLasOfertas: () => of(mockOfertas),
    obtenerTodasLasPracticas: () => of(mockPracticas),
    obtenerComentariosPendientes: () => of(mockComentarios),
    verificarEmpresa: vi.fn(() => of('Empresa verificada')),
    cerrarOfertaPorAdmin: () => of('Oferta cerrada'),
    moderarComentario: () => of({ idComment: 5, status: 'APROBADO' }),
    subirFotoAdminCloudinary: () => of({ url: 'https://res.cloudinary.com/demo/admin.png' })
  };

  // Solo la oferta 1 tiene un estudiante aceptado
  const postulacionServiceMock = {
    verPostuladosPorOferta: (idOffer: number) => of(idOffer === 1
      ? [{ idPostulation: 10, studentFullName: 'Brayan Alfaro', studentDocument: '1003558974', statusPostulation: 'ACEPTADA' }]
      : [])
  };

  beforeEach(async () => {
    const ls: { [key: string]: string } = {
      usuario_sesion: JSON.stringify({ idUser: 1, email: 'admin@ucundinamarca.edu.co', userRol: 'administrador' }),
      token: 'header.eyJzdWIiOiJhZG1pbkB1Y3VuZGluYW1hcmNhLmVkdS5jbyJ9.signature'
    };
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => ls[key] ?? null,
      setItem: (key: string, val: string) => { ls[key] = val; },
      removeItem: (key: string) => { delete ls[key]; },
      clear: () => {}
    });
    adminServiceMock.verificarEmpresa.mockClear();
    adminServiceMock.obtenerTodasLasEmpresas.mockClear();

    await TestBed.configureTestingModule({
      imports: [PanelAdministrador],
      providers: [
        { provide: Admin, useValue: adminServiceMock },
        { provide: PostulacionService, useValue: postulacionServiceMock },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PanelAdministrador);
    fixture.detectChanges();
    store = fixture.debugElement.injector.get(PanelAdminStore);
  });

  afterEach(() => vi.unstubAllGlobals());

  function mostrarVista<T>(vista: Parameters<PanelAdminStore['cambiarVista']>[0], tipo: new (...a: any[]) => T): T {
    store.cambiarVista(vista);
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(tipo)).componentInstance as T;
  }

  it('separa empresas PENDIENTES de APROBADAS (computed del store)', () => {
    expect(store.empresasPendientes().length).toBe(1);
    expect(store.empresasAprobadas().length).toBe(2);
  });

  it('resuelve el nombre de la empresa a partir de su NIT', () => {
    expect(store.nombreEmpresaPorNit('901234567-8')).toBe('Tech Solutions');
    expect(store.nombreEmpresaPorNit('000')).toBe('Empresa (NIT: 000)');
  });

  it('calcula los cupos iniciales sumando cupos disponibles más estudiantes aceptados', () => {
    expect(store.cuposIniciales(mockOfertas[0])).toBe(1);
    expect(store.cuposIniciales(mockOfertas[1])).toBe(2);
  });

  it('construye "alumnos en práctica" a partir de ofertas, postulaciones aceptadas y prácticas', () => {
    const alumnos = store.alumnosEnPractica();
    expect(alumnos.length).toBe(1);
    expect(alumnos[0].studentFullName).toBe('Brayan Alfaro');
    expect(alumnos[0].companyName).toBe('Tech Solutions');
    expect(alumnos[0].idPractice).toBe(1);
  });

  it('vista Ofertas: clasifica en Actuales e Historial y aplica los filtros', () => {
    const vista = mostrarVista('ofertas', AdminOfertas);
    expect(vista.actuales().length).toBe(1);
    expect(vista.historial().length).toBe(1);

    vista.filtrar(vista.filtroModalidad, 'Presencial');
    vista.filtrar(vista.filtroProfesion, 'Contaduría Pública');
    expect(vista.actuales().length).toBe(1);

    vista.filtrar(vista.filtroModalidad, 'Híbrido');
    expect(vista.actuales().length).toBe(0);
  });

  it('vista Empresas: filtra por texto, ciudad y tipo de sociedad y vuelve a la página 1', () => {
    const vista = mostrarVista('empresas', AdminEmpresas);
    vista.pagina.set(3);
    vista.filtrar(vista.filtroTexto, 'Tech');
    expect(vista.pagina()).toBe(1);
    expect(vista.filtradas().map(e => e.nit)).toEqual(['901234567-8']);

    vista.filtrar(vista.filtroTexto, '');
    vista.filtrar(vista.filtroCiudad, 'Chía');
    expect(vista.filtradas().map(e => e.nit)).toEqual(['966625556-7']);
    expect(vista.ciudadesDisponibles()).toEqual(['Fusagasugá', 'Chía']);
  });

  it('vista Estudiantes: al cambiar de sede se reinicia el programa y se filtra por programa', () => {
    const vista = mostrarVista('estudiantes', AdminEstudiantes);
    vista.cambiarPrograma('Ingeniería de Sistemas y Computación');
    vista.cambiarSede('Fusagasugá');
    expect(vista.filtroPrograma()).toBe('TODOS');
    expect(vista.filtrados().length).toBe(1);
    vista.filtrarTexto('no-existe');
    expect(vista.filtrados().length).toBe(0);
  });

  it('verificar una empresa llama al servicio, cierra el modal y recarga empresas', () => {
    store.empresaModal.set(mockEmpresas[0]);
    store.verificarEmpresa('900111222-3', true);
    expect(adminServiceMock.verificarEmpresa).toHaveBeenCalledWith('900111222-3', true);
    expect(store.mensajeExito()).toBe('Empresa verificada');
    expect(store.empresaModal()).toBeNull();
    expect(adminServiceMock.obtenerTodasLasEmpresas).toHaveBeenCalledTimes(2); // carga inicial + recarga
  });

  it('el shell muestra solo la vista seleccionada', () => {
    expect(fixture.nativeElement.querySelector('app-admin-pendientes')).toBeTruthy();
    store.cambiarVista('comentarios');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-admin-pendientes')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-admin-comentarios')).toBeTruthy();
  });

  it('funciones puras de normalización y paginación', () => {
    expect(normalizarCodigoTipoEmpresa('S.A.S.')).toBe('SAS');
    expect(normalizarCodigoTipoEmpresa('Limitada')).toBe('LTDA');
    expect(coincideProgramaAcademico('Ingeniería Agronómica', 'ingenieria agronomica')).toBe(true);
    expect(paginar([1, 2, 3, 4, 5, 6, 7], 2, 5)).toEqual([6, 7]);
    expect(totalPaginas(0, 5)).toBe(1);
  });
});
