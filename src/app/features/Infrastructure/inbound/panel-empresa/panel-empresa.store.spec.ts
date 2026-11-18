import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PanelEmpresaStore } from './panel-empresa.store';
import { OfertaService } from '../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { Empresa } from '../../../../core/services/empresa/empresa';
import { IaSeguridadService } from '../../../../core/services/ia-seguridad/ia-seguridad';
import { environment } from '../../../../../environments/environment';

const API = environment.baseUrl;

describe('PanelEmpresaStore', () => {
  let store: PanelEmpresaStore;
  let http: HttpTestingController;
  let empresas: Record<string, ReturnType<typeof vi.fn>>;
  let ofertas: Record<string, ReturnType<typeof vi.fn>>;
  let postulacion: Record<string, ReturnType<typeof vi.fn>>;
  let ia: Record<string, ReturnType<typeof vi.fn>>;

  const empresaBD = {
    idUser: 8, nit: '900', companyName: 'Nexus Software', legalName: 'Nexus SAS', companyType: 'PRIVADA',
    companyPhoneNumber: '300', city: 'Bogotá', companyAddress: 'Cra 1', logoUrl: 'https://logo.png',
    rutPdfUrl: 'https://nit.pdf', legalRepresentative: { numberDocument: '55', nameRepresentative: 'Laura', lastNameRepresentative: 'Ruiz' }
  };
  const oferta = { idOffer: 5, practiceName: 'Backend', nitCompanyAssociated: '900', availableSpots: 2, modality: 'Remoto', salary: 1300000 };
  const otraEmpresa = { idOffer: 6, practiceName: 'Ajena', nitCompanyAssociated: '111', availableSpots: 9 };
  const aceptado = { idPostulation: 3, statusPostulation: 'ACEPTADA', documentStudent: '1001', studentFullName: 'Ana Pérez' };

  beforeEach(() => {
    localStorage.clear();
    empresas = { obtenerTodasLasEmpresas: vi.fn(() => of([empresaBD])) };
    ofertas = { listarOfertasActivas: vi.fn(() => of([oferta])) };
    postulacion = { verPostuladosPorOferta: vi.fn(() => of([aceptado, { idPostulation: 4, statusPostulation: 'POSTULADA' }])) };
    ia = { obtenerRankingPostulados: vi.fn(() => of({ practiceName: 'Backend', totalCandidatesAnalyzed: 3, aiRankingAnalysis: '1. Ana' })) };

    TestBed.configureTestingModule({
      providers: [
        PanelEmpresaStore, provideHttpClient(), provideHttpClientTesting(),
        { provide: Empresa, useValue: empresas },
        { provide: OfertaService, useValue: ofertas },
        { provide: PostulacionService, useValue: postulacion },
        { provide: IaSeguridadService, useValue: ia }
      ]
    });
    store = TestBed.inject(PanelEmpresaStore);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /** Responde las peticiones que dispara la carga de ofertas, prácticas y contratos. */
  const responderCarga = (contratos: unknown[] = []) => {
    http.expectOne(`${API}/admin/ofertas`).flush([oferta, otraEmpresa]);
    http.match(r => r.url.startsWith(`${API}/registro/estudiantes/perfil/`))
      .forEach(r => r.flush({ photoUrl: 'https://foto.png', skills: 'Java', linkLifesheet: 'https://cv.pdf' }));
    http.expectOne(`${API}/documentos/empresa/900`).flush(contratos);
  };

  it('inicializar: lee la sesión, encuentra la empresa en BD y carga ofertas, prácticas y contratos', () => {
    localStorage.setItem('usuario_sesion', JSON.stringify({ email: 'talento@nexus.co', idUser: 8 }));
    store.inicializar();
    responderCarga([{ idPostulation: 3, companyComments: 'Firmado', trackingStatus: 'CONTRATO_FIRMADO' }]);

    expect(store.nombreEmpresa()).toBe('Nexus Software');
    expect(store.nitEmpresa()).toBe('900');
    expect(store.logoUrl()).toBe('https://logo.png');
    expect(store.pdfNitUrl()).toBe('https://nit.pdf');
    expect(store.ccRepresentanteLegal()).toBe('55');
    expect(store.misOfertas().map(o => o.idOffer)).toEqual([5]); // filtra por NIT
    expect(store.totalCuposDisponibles()).toBe(2);
    expect(store.misPracticas()).toHaveLength(1);
    expect(store.misPracticas()[0]).toMatchObject({ studentFullName: 'Ana Pérez', studentSkills: 'Java', photoUrl: 'https://foto.png' });
    expect(store.contratosPorPostulacion()[3]).toBeTruthy();
    expect(store.comentariosContrato[3]).toBe('Firmado');
    expect(store.estadoSeguimientoContrato[3]).toBe('CONTRATO_FIRMADO');

    expect(store.valoresPerfil()).toMatchObject({
      companyName: 'Nexus Software', businessName: 'Nexus SAS', companyType: 'Privada',
      phone: '300', city: 'Bogotá', legalRepName: 'Laura', legalRepLastName: 'Ruiz'
    });
  });

  it('sin empresa en BD deriva el nombre del correo y usa los valores de sesión en el perfil', () => {
    localStorage.setItem('usuario_sesion', JSON.stringify({ email: 'recursos.humanos@acme.co', nit: '777' }));
    empresas['obtenerTodasLasEmpresas'].mockReturnValue(of([]));
    store.inicializar();
    http.expectOne(`${API}/admin/ofertas`).flush([]);
    http.expectOne(`${API}/documentos/empresa/777`).flush([]);

    expect(store.nombreEmpresa()).toBe('Recursos Humanos');
    expect(store.empresaBD()).toBeNull();
    expect(store.valoresPerfil()).toEqual({ companyName: 'Recursos Humanos', nit: '777', email: 'recursos.humanos@acme.co' });
  });

  it('si fallan las empresas igual carga ofertas; si falla /admin/ofertas usa las activas', () => {
    localStorage.setItem('usuario_sesion', JSON.stringify({ email: 'a@b.co', nit: '900', companyName: 'Nexus' }));
    empresas['obtenerTodasLasEmpresas'].mockReturnValue(throwError(() => new Error()));
    store.inicializar();
    expect(store.nombreEmpresa()).toBe('Nexus');
    http.expectOne(`${API}/admin/ofertas`).flush('', { status: 500, statusText: 'Error' });
    http.match(r => r.url.startsWith(`${API}/registro/estudiantes/perfil/`)).forEach(r => r.flush(null));
    http.expectOne(`${API}/documentos/empresa/900`).flush('', { status: 500, statusText: 'Error' });

    expect(ofertas['listarOfertasActivas']).toHaveBeenCalled();
    expect(store.misOfertas()).toHaveLength(1);
    expect(store.cargando()).toBe(false);
  });

  it('si también fallan las activas queda sin ofertas; una sesión corrupta no rompe', () => {
    localStorage.setItem('usuario_sesion', '{corrupta');
    ofertas['listarOfertasActivas'].mockReturnValue(throwError(() => new Error()));
    store.inicializar();
    http.expectOne(`${API}/admin/ofertas`).flush('', { status: 500, statusText: 'Error' });
    expect(store.misOfertas()).toEqual([]);
  });

  it('cambiarVista recarga en las vistas de listados y verPostulantes selecciona la oferta', () => {
    store.nitEmpresa.set('900');
    store.cambiarVista('mis-ofertas');
    responderCarga();
    expect(store.vista()).toBe('mis-ofertas');

    store.cambiarVista('perfil');
    http.expectNone(`${API}/admin/ofertas`);

    store.mensajeError.set('x');
    store.verPostulantes(oferta as never);
    expect(store.vista()).toBe('postulantes');
    expect(store.ofertaSeleccionada()?.idOffer).toBe(5);
    expect(store.mensajeError()).toBe('');
  });

  it('registrarAceptacion descuenta un cupo y prepara el seguimiento; registrarContrato lo guarda', () => {
    store.nitEmpresa.set('900');
    const copia = { ...oferta };
    store.misOfertas.set([copia as never]);
    store.ofertaSeleccionada.set(copia as never);

    store.registrarAceptacion(3, 'Bienvenida');
    http.match(() => true).forEach(r => r.flush([]));

    expect(store.ofertaSeleccionada()?.availableSpots).toBe(1);
    expect(store.estadoSeguimientoContrato[3]).toBe('EN_CURSO');
    expect(store.comentariosContrato[3]).toBe('Bienvenida');

    store.registrarContrato(3, { fileUrl: 'https://c.pdf' });
    expect(store.contratosPorPostulacion()[3].fileUrl).toBe('https://c.pdf');
  });

  it('cargarContratosEmpresa no consulta sin NIT', () => {
    store.cargarContratosEmpresa();
    http.expectNone(r => r.url.includes('/documentos/empresa/'));
  });

  describe('ranking con IA', () => {
    it('no abre sin oferta', () => {
      store.abrirRankingIa(null);
      expect(store.rankingIa().abierto).toBe(false);
    });

    it('muestra el análisis de la oferta seleccionada y se cierra', () => {
      store.ofertaSeleccionada.set(oferta as never);
      store.abrirRankingIa();
      expect(store.rankingIa()).toMatchObject({ abierto: true, cargando: false, totalAnalizados: 3, resultado: '1. Ana' });
      store.cerrarRankingIa();
      expect(store.rankingIa().abierto).toBe(false);
    });

    it('muestra el error si la IA falla', () => {
      ia['obtenerRankingPostulados'].mockReturnValue(throwError(() => new Error()));
      store.abrirRankingIa(oferta as never);
      expect(store.rankingIa().error).toContain('No se pudo generar');
    });
  });

  afterEach(() => http.match(() => true).forEach(r => r.flush([])));
});
