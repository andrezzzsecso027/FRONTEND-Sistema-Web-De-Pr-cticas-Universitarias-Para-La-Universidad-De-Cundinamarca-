import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PanelEmpresaStore, PracticaEmpresaView } from '../panel-empresa.store';
import { EmpresaPostulantes } from './empresa-postulantes/empresa-postulantes';
import { EmpresaMisPracticas } from './empresa-mis-practicas/empresa-mis-practicas';
import { OfertaService } from '../../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../../core/services/postulacion/postulacion';
import { Empresa } from '../../../../../core/services/empresa/empresa';
import { IaSeguridadService } from '../../../../../core/services/ia-seguridad/ia-seguridad';
import { environment } from '../../../../../../environments/environment';

const API = environment.baseUrl;

/** Vistas del panel de empresa que dependen del store: postulantes y "Mis prácticas". */
describe('Vistas del panel de empresa', () => {
  let http: HttpTestingController;
  let store: PanelEmpresaStore;
  let postulacion: Record<string, ReturnType<typeof vi.fn>>;
  let empresa: Record<string, ReturnType<typeof vi.fn>>;

  const postulante = () => ({
    idPostulation: 3, statusPostulation: 'POSTULADA', studentFullName: 'Ana Pérez', documentStudent: '1001'
  });

  beforeEach(() => {
    postulacion = {
      verPostuladosPorOferta: vi.fn(() => of([postulante(), { idPostulation: 4, studentFullName: '  ' }, { idPostulation: 5, studentFullName: 'Sin doc' }])),
      cambiarEstadoPostulacion: vi.fn(() => of({}))
    };
    empresa = { subirArchivoCloudinary: vi.fn(() => of({ url: 'https://cdn/contrato.pdf' })), obtenerTodasLasEmpresas: vi.fn(() => of([])) };

    TestBed.configureTestingModule({
      providers: [
        PanelEmpresaStore, provideHttpClient(), provideHttpClientTesting(),
        { provide: PostulacionService, useValue: postulacion },
        { provide: Empresa, useValue: empresa },
        { provide: OfertaService, useValue: { listarOfertasActivas: vi.fn(() => of([])) } },
        { provide: IaSeguridadService, useValue: {} }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(PanelEmpresaStore);
    store.nitEmpresa.set('900');
  });

  afterEach(() => http.match(() => true).forEach(r => r.flush([])));

  describe('EmpresaPostulantes', () => {
    const crear = () => {
      const fixture = TestBed.createComponent(EmpresaPostulantes);
      fixture.detectChanges();
      return fixture.componentInstance;
    };

    it('sin oferta seleccionada no consulta postulantes', () => {
      crear();
      expect(postulacion['verPostuladosPorOferta']).not.toHaveBeenCalled();
    });

    it('carga los postulantes con nombre y completa su perfil', () => {
      store.ofertaSeleccionada.set({ idOffer: 5, practiceName: 'Backend', availableSpots: 2 } as never);
      const c = crear();
      http.expectOne(`${API}/documentos/empresa/900`).flush([]);
      http.expectOne(`${API}/registro/estudiantes/perfil/1001`).flush({ skills: 'Java', photoUrl: 'https://foto.png' });

      expect(c.postulantes.map(p => p.idPostulation)).toEqual([3, 5]);
      expect((c.postulantes[0] as any).skills).toBe('Java');
      expect(store.estadoSeguimientoContrato[3]).toBe('EN_CURSO');
    });

    it('si falla la carga deja la lista vacía', () => {
      postulacion['verPostuladosPorOferta'].mockReturnValue(throwError(() => new Error()));
      store.ofertaSeleccionada.set({ idOffer: 5 } as never);
      const c = crear();
      expect(c.postulantes).toEqual([]);
      expect(c.cargando).toBe(false);
    });

    it('aceptar registra la aceptación con la observación por defecto', () => {
      const c = crear();
      const registrar = vi.spyOn(store, 'registrarAceptacion');
      const p = postulante();
      c.decidirPostulacion(p as never, 'ACEPTADA');
      expect(postulacion['cambiarEstadoPostulacion']).toHaveBeenCalledWith(3, 'ACEPTADA', expect.stringContaining('Cumple'));
      expect(p.statusPostulation).toBe('ACEPTADA');
      expect(store.mensajeExito()).toContain('ACEPTADO');
      expect(registrar).toHaveBeenCalled();
    });

    it('rechazar usa la observación escrita; un error muestra el mensaje', () => {
      const c = crear();
      c.observacionesPorPostulante[3] = 'Falta experiencia';
      c.decidirPostulacion(postulante() as never, 'RECHAZADA');
      expect(postulacion['cambiarEstadoPostulacion']).toHaveBeenCalledWith(3, 'RECHAZADA', 'Falta experiencia');
      expect(store.mensajeExito()).toContain('RECHAZADO');

      postulacion['cambiarEstadoPostulacion'].mockReturnValue(throwError(() => ({ error: 'Sin cupos' })));
      c.decidirPostulacion(postulante() as never, 'ACEPTADA');
      expect(store.mensajeError()).toBe('Sin cupos');
      postulacion['cambiarEstadoPostulacion'].mockReturnValue(throwError(() => ({})));
      c.decidirPostulacion(postulante() as never, 'ACEPTADA');
      expect(store.mensajeError()).toContain('Error al actualizar');
    });
  });

  describe('EmpresaMisPracticas', () => {
    const item: PracticaEmpresaView = {
      idPostulation: 3, idOffer: 5, offerName: 'Backend', modality: 'Remoto', salary: 1, studentDocument: '1001',
      studentFullName: 'Ana Pérez', studentEmail: '', studentSkills: '', studentEnglishLevel: '', studentCvUrl: null,
      studentGithubUrl: null, photoUrl: null
    };
    const evento = (f?: File) => ({ target: { files: f ? [f] : [] } }) as unknown as Event;
    const crear = () => {
      const fixture = TestBed.createComponent(EmpresaMisPracticas);
      fixture.detectChanges();
      return fixture.componentInstance;
    };

    it('actualizar recarga ofertas y contratos', () => {
      const c = crear();
      c.actualizar();
      http.expectOne(`${API}/admin/ofertas`).flush([]);
      http.expectOne(`${API}/documentos/empresa/900`).flush([]);
    });

    it('sube el contrato, lo registra y avisa', () => {
      const c = crear();
      c.onSeleccionarContratoPdf(evento(), item);
      expect(empresa['subirArchivoCloudinary']).not.toHaveBeenCalled();

      c.onSeleccionarContratoPdf(evento(new File(['x'], 'contrato.pdf')), item);
      const req = http.expectOne(`${API}/documentos/seguimiento`);
      expect(req.request.body).toMatchObject({ idPostulation: 3, nitCompany: '900', fileUrl: 'https://cdn/contrato.pdf', trackingStatus: 'CONTRATO_FIRMADO' });
      req.flush({ trackingStatus: 'CONTRATO_FIRMADO', fileUrl: 'https://cdn/contrato.pdf' });
      expect(store.contratosPorPostulacion()[3]).toBeTruthy();
      expect(store.mensajeExito()).toContain('contrato.pdf');
      expect(c.subiendoContratoId).toBeNull();
    });

    it('informa si falla la subida o el registro del contrato', () => {
      const c = crear();
      c.onSeleccionarContratoPdf(evento(new File(['x'], 'c.pdf')), item);
      http.expectOne(`${API}/documentos/seguimiento`).flush('', { status: 500, statusText: 'Error' });
      expect(store.mensajeError()).toContain('error al registrarlo');

      empresa['subirArchivoCloudinary'].mockReturnValue(throwError(() => new Error()));
      c.onSeleccionarContratoPdf(evento(new File(['x'], 'c.pdf')), item);
      expect(store.mensajeError()).toContain('Cloudinary');
    });

    it('guarda el seguimiento con el contrato actual o informa el error', () => {
      const c = crear();
      store.registrarContrato(3, { fileName: 'c.pdf', fileUrl: 'https://c.pdf', offerName: 'Backend' });
      store.comentariosContrato[3] = 'Va muy bien';
      c.guardarSeguimiento({ ...item, offerName: '' });
      const req = http.expectOne(`${API}/documentos/seguimiento`);
      expect(req.request.body).toMatchObject({ fileUrl: 'https://c.pdf', companyComments: 'Va muy bien', offerName: 'Backend' });
      req.flush({ trackingStatus: 'EN_CURSO' });
      expect(store.mensajeExito()).toContain('actualizados');

      c.guardarSeguimiento(item);
      http.expectOne(`${API}/documentos/seguimiento`).flush('', { status: 500, statusText: 'Error' });
      expect(store.mensajeError()).toContain('No fue posible actualizar');
      expect(c.guardandoSeguimientoId).toBeNull();
    });
  });
});
