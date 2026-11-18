import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PanelAdminStore } from './panel-administrador.store';
import { Admin } from '../../../../core/services/admin/admin';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { environment } from '../../../../../environments/environment';

describe('PanelAdminStore', () => {
  let store: PanelAdminStore;
  let http: HttpTestingController;
  let admin: Record<string, ReturnType<typeof vi.fn>>;
  let postulacion: Record<string, ReturnType<typeof vi.fn>>;

  const empresas = [
    { nit: '900', companyName: 'Nexus', verificationStatus: 'PENDIENTE' },
    { nit: '901', companyName: 'Andes Tech', verificationStatus: 'APROBADA', email: 'rh@andes.co' }
  ];
  const estudiantes = [{ document: '1001', name: 'Ana', lastName: 'Pérez', academicProgram: 'Sistemas' }];
  const oferta = {
    idOffer: 5, practiceName: 'Backend', nitCompanyAssociated: '901', availableSpots: 1,
    profession: 'Sistemas', modality: 'Remoto', closingDate: '2026-12-01'
  };
  const aceptado = {
    idPostulation: 3, statusPostulation: 'ACEPTADA', studentDocument: '1001', studentFullName: 'Ana Pérez',
    studentEmail: 'ana@ucundinamarca.edu.co'
  };

  beforeEach(() => {
    localStorage.clear();
    admin = {
      obtenerTodasLasEmpresas: vi.fn(() => of(empresas)),
      obtenerEstudiantes: vi.fn(() => of(estudiantes)),
      obtenerTodasLasOfertas: vi.fn(() => of([oferta])),
      obtenerTodasLasPracticas: vi.fn(() => of([{ idPostulation: 3, idPractice: 70, startDate: '2026-02-01' }])),
      obtenerComentariosPendientes: vi.fn(() => of([{ idComment: 1 }])),
      verificarEmpresa: vi.fn(() => of('')),
      cerrarOfertaPorAdmin: vi.fn(() => of('')),
      moderarComentario: vi.fn(() => of({})),
      subirFotoAdminCloudinary: vi.fn(() => of({ url: 'https://img/admin.png' })),
      obtenerPerfilEstudiante: vi.fn(() => of({ documentStudent: '1001', skills: 'Java' }))
    };
    postulacion = { verPostuladosPorOferta: vi.fn(() => of([aceptado, { idPostulation: 4, statusPostulation: 'POSTULADA' }])) };

    TestBed.configureTestingModule({
      providers: [
        PanelAdminStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Admin, useValue: admin },
        { provide: PostulacionService, useValue: postulacion }
      ]
    });
    store = TestBed.inject(PanelAdminStore);
    http = TestBed.inject(HttpTestingController);
  });

  const cargarTodo = () => {
    store.cargarTodo();
    http.expectOne(`${environment.baseUrl}/documentos/todos`).flush([
      { idPostulation: 3, documentStudent: '1001', fileUrl: 'https://x/c.pdf' },
      { documentStudent: '2002', fileUrl: 'https://x/d.pdf' }
    ]);
  };

  describe('inicializarSesion', () => {
    it('sin sesión ni token devuelve false', () => {
      expect(store.inicializarSesion()).toBe(false);
    });

    it('toma el correo de la sesión guardada y su avatar', () => {
      localStorage.setItem('usuario_sesion', JSON.stringify({ email: 'admin@udec.co' }));
      localStorage.setItem('avatar_admin_admin@udec.co', 'https://img/a.png');
      expect(store.inicializarSesion()).toBe(true);
      expect(store.correoAdmin()).toBe('admin@udec.co');
      expect(store.avatarAdminUrl()).toBe('https://img/a.png');
    });

    it('si no hay sesión usa el "sub" del JWT; si la sesión está corrupta también', () => {
      const token = `x.${btoa(JSON.stringify({ sub: 'jwt@udec.co' }))}.y`;
      localStorage.setItem('token', token);
      expect(store.inicializarSesion()).toBe(true);
      expect(store.correoAdmin()).toBe('jwt@udec.co');

      localStorage.setItem('usuario_sesion', '{no-es-json');
      expect(store.inicializarSesion()).toBe(true);
      expect(store.correoAdmin()).toBe('jwt@udec.co');

      localStorage.setItem('token', 'token-invalido');
      localStorage.removeItem('usuario_sesion');
      expect(store.inicializarSesion()).toBe(false);
    });
  });

  it('cargarTodo llena las listas y deriva pendientes, aprobadas y alumnos en práctica', () => {
    cargarTodo();

    expect(store.empresasPendientes().map(e => e.nit)).toEqual(['900']);
    expect(store.empresasAprobadas().map(e => e.nit)).toEqual(['901']);
    expect(store.comentariosPendientes()).toHaveLength(1);
    expect(store.aceptadosPorOferta(5)).toHaveLength(1);
    expect(store.cuposIniciales(oferta as never)).toBe(2);

    const [alumno] = store.alumnosEnPractica();
    expect(alumno).toMatchObject({ idPractice: 70, companyName: 'Andes Tech', studentFullName: 'Ana Pérez', startDate: '2026-02-01' });
    expect(store.documentoDePractica({ idPostulation: 3 })?.fileUrl).toBe('https://x/c.pdf');
    expect(store.documentoDePractica({ studentDocument: '2002' })?.fileUrl).toBe('https://x/d.pdf');
    expect(store.documentoDePractica({ studentDocument: '' })).toBeNull();
    expect(store.documentoDePractica(null)).toBeNull();
  });

  it('los errores de carga dejan las listas vacías', () => {
    for (const k of ['obtenerTodasLasEmpresas', 'obtenerEstudiantes', 'obtenerTodasLasOfertas', 'obtenerTodasLasPracticas', 'obtenerComentariosPendientes']) {
      admin[k].mockReturnValue(throwError(() => new Error()));
    }
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.cargarTodo();
    http.expectOne(`${environment.baseUrl}/documentos/todos`).flush('', { status: 500, statusText: 'Error' });

    expect(store.todasLasEmpresas()).toEqual([]);
    expect(store.estudiantes()).toEqual([]);
    expect(store.ofertas()).toEqual([]);
    expect(store.practicasRaw()).toEqual([]);
    expect(store.comentariosPendientes()).toEqual([]);
  });

  it('si fallan los postulantes de una oferta queda una lista vacía para ella', () => {
    postulacion['verPostuladosPorOferta'].mockReturnValue(throwError(() => new Error()));
    store.cargarOfertasYPracticas();
    expect(store.postulantesPorOferta()[5]).toEqual([]);
  });

  it('cambiarVista limpia mensajes y en "practicas" recarga los contratos', () => {
    store.mensajeError.set('x');
    store.cambiarVista('practicas');
    http.expectOne(`${environment.baseUrl}/documentos/todos`).flush([]);
    expect(store.vista()).toBe('practicas');
    expect(store.mensajeError()).toBe('');
  });

  describe('acciones', () => {
    it('verificarEmpresa: éxito con mensaje por defecto y error con mensaje del backend', () => {
      store.verificarEmpresa('900', true);
      expect(store.mensajeExito()).toContain('aprobada');
      store.verificarEmpresa('900', false);
      expect(store.mensajeExito()).toContain('rechazada');

      admin['verificarEmpresa'].mockReturnValue(throwError(() => ({ error: 'Falta el PDF del NIT' })));
      store.verificarEmpresa('900', true);
      expect(store.mensajeError()).toBe('Falta el PDF del NIT');
      admin['verificarEmpresa'].mockReturnValue(throwError(() => ({})));
      store.verificarEmpresa('900', true);
      expect(store.mensajeError()).toContain('Error al procesar');
      expect(store.procesandoId()).toBeNull();
    });

    it('cerrarOferta y moderarComentario informan éxito o error', () => {
      store.cerrarOferta(oferta as never);
      expect(store.mensajeExito()).toContain('Backend');
      admin['cerrarOfertaPorAdmin'].mockReturnValue(throwError(() => new Error()));
      store.cerrarOferta(oferta as never);
      expect(store.mensajeError()).toContain('No se pudo cerrar');

      store.moderarComentario({ idComment: 1 } as never, true);
      expect(store.mensajeExito()).toContain('aprobado');
      store.moderarComentario({ idComment: 1 } as never, false);
      expect(store.mensajeExito()).toContain('rechazado');
      admin['moderarComentario'].mockReturnValue(throwError(() => new Error()));
      store.moderarComentario({ idComment: 1 } as never, true);
      expect(store.mensajeError()).toContain('Error al moderar');
    });

    it('subirFotoAdmin guarda la URL o informa el error', () => {
      store.correoAdmin.set('admin@udec.co');
      store.subirFotoAdmin(new File([''], 'a.png'));
      expect(store.avatarAdminUrl()).toBe('https://img/admin.png');
      expect(localStorage.getItem('avatar_admin_admin@udec.co')).toBe('https://img/admin.png');

      admin['subirFotoAdminCloudinary'].mockReturnValue(throwError(() => new Error()));
      store.subirFotoAdmin(new File([''], 'a.png'));
      expect(store.mensajeError()).toContain('No se pudo subir');
    });
  });

  describe('modales', () => {
    it('abre el perfil del estudiante (encontrado o con datos de respaldo) y lo cierra', () => {
      cargarTodo();
      store.abrirPerfilEstudiantePorDocumento('1001');
      expect(store.estudianteModal()?.name).toBe('Ana');
      expect(store.perfilEstudianteModal()?.skills).toBe('Java');
      expect(store.cargandoPerfilEstudiante()).toBe(false);

      store.abrirPerfilEstudiantePorDocumento(undefined, 'ana pérez');
      expect(store.estudianteModal()?.document).toBe('1001');

      admin['obtenerPerfilEstudiante'].mockReturnValue(throwError(() => new Error()));
      store.abrirPerfilEstudiantePorDocumento('9999', 'Luis', 'Industrial');
      expect(store.estudianteModal()).toMatchObject({ document: '9999', name: 'Luis', academicProgram: 'Industrial' });
      expect(store.perfilEstudianteModal()).toBeNull();

      store.cerrarPerfilEstudiante();
      expect(store.estudianteModal()).toBeNull();
    });

    it('seleccionadosOfertaModal lista los aceptados de la oferta abierta', () => {
      cargarTodo();
      expect(store.seleccionadosOfertaModal()).toEqual([]);
      store.ofertaHistorialModal.set(oferta as never);
      expect(store.seleccionadosOfertaModal()).toHaveLength(1);
    });
  });

  describe('consultas', () => {
    beforeEach(() => cargarTodo());

    it('nombres, correos y documentos con valores de respaldo', () => {
      expect(store.nombreEmpresaPorNit('901')).toBe('Andes Tech');
      expect(store.nombreEmpresaPorNit('999')).toContain('999');
      expect(store.nombreEmpresaPorNit()).toBe('Empresa Aliada');

      expect(store.correoEmpresa(empresas[1] as never)).toBe('rh@andes.co');
      expect(store.correoEmpresa({ companyName: 'Nexus S.A.S.' } as never)).toBe('contacto@nexussas.com.co');

      expect(store.correoEstudiante(null)).toBe('');
      expect(store.correoEstudiante({ email: 'x@y.co' })).toBe('x@y.co');
      expect(store.correoEstudiante({ document: '1001' })).toBe('ana@ucundinamarca.edu.co');
      expect(store.correoEstudiante({ document: '7', name: 'José Luis', lastName: 'Núñez Gil' }))
        .toBe('jose.nunez@ucundinamarca.edu.co');

      expect(store.documentoPorNombre('Ana Pérez')).toBe('1001');
      expect(store.documentoPorNombre('Nadie')).toBe('Registrado');
      expect(store.documentoPorNombre()).toBe('Registrado');
    });

    it('certificado NIT y tipo de empresa', () => {
      expect(store.tieneCertificadoNit({ rutPdfUrl: 'https://cdn/x.pdf' } as never)).toBe(true);
      expect(store.tieneCertificadoNit({ rutPdfUrl: 'http://cdn/x.png' } as never)).toBe(false);
      expect(store.urlPdfNit({ nit: '1', urlPdfNit: 'https://a.pdf' } as never)).toBe('https://a.pdf');
      expect(store.urlPdfNit({ nit: '1' } as never)).toBeNull();

      expect(store.etiquetaTipoEmpresa(undefined)).toBeTruthy();
      expect(store.etiquetaTipoEmpresa('tipo-inexistente-xyz')).toBe('tipo-inexistente-xyz');
    });
  });
});
