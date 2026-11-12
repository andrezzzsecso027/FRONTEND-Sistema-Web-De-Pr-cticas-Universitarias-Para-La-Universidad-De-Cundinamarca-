import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Admin, Company } from './admin';
import { environment } from '../../../../environments/environment';

describe('Admin Service (Pruebas Unitarias)', () => {
  let service: Admin;
  let httpMock: HttpTestingController;
  const baseApi = `${environment.baseUrl}${environment.endpoints.adminEmpresas}`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        Admin,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(Admin);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe obtener el listado de todas las empresas correctamente (GET)', () => {
    const mockEmpresas: Company[] = [
      { nit: '900123456-7', companyName: 'Tech Solutions SAS', verificationStatus: 'APROBADA' },
      { nit: '900999888-1', companyName: 'AgroSumapaz LTDA', verificationStatus: 'PENDIENTE' }
    ];

    service.obtenerTodasLasEmpresas().subscribe((empresas) => {
      expect(empresas.length).toBe(2);
      expect(empresas[0].companyName).toBe('Tech Solutions SAS');
    });

    const req = httpMock.expectOne(`${baseApi}/empresas/todas`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEmpresas);
  });

  it('debe obtener únicamente las empresas pendientes de verificación (GET)', () => {
    service.obtenerEmpresasPendientes().subscribe((pendientes) => {
      expect(pendientes.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseApi}/empresas/pendientes`);
    expect(req.request.method).toBe('GET');
    req.flush([{ nit: '900999888-1', companyName: 'AgroSumapaz LTDA', verificationStatus: 'PENDIENTE' }]);
  });

  it('debe obtener el listado general de estudiantes registrados (GET)', () => {
    service.obtenerEstudiantes().subscribe((estudiantes) => {
      expect(estudiantes.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseApi}/estudiantes`);
    expect(req.request.method).toBe('GET');
    req.flush([{ document: '1003558974', name: 'Brayan', lastName: 'Alfaro' }]);
  });

  it('debe obtener el perfil detallado de un estudiante por su documento (GET)', () => {
    service.obtenerPerfilEstudiante('1003558974').subscribe((perfil) => {
      expect(perfil.documentStudent).toBe('1003558974');
      expect(perfil.englishLevel).toBe('B2');
    });

    const req = httpMock.expectOne(`${baseApi}/estudiantes/1003558974/perfil`);
    expect(req.request.method).toBe('GET');
    req.flush({ documentStudent: '1003558974', skills: 'Java, Angular', englishLevel: 'B2' });
  });

  it('debe obtener todas las ofertas registradas en la plataforma (GET)', () => {
    service.obtenerTodasLasOfertas().subscribe((ofertas) => {
      expect(ofertas.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseApi}/ofertas`);
    expect(req.request.method).toBe('GET');
    req.flush([{ idOffer: 1, practiceName: 'Desarrollador Backend' }]);
  });

  it('debe obtener todas las prácticas activas y finalizadas (GET)', () => {
    service.obtenerTodasLasPracticas().subscribe((practicas) => {
      expect(practicas.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseApi}/practicas`);
    expect(req.request.method).toBe('GET');
    req.flush([{ idPractice: 1, statusPractice: 'EN_CURSO' }]);
  });

  it('debe obtener los comentarios pendientes de moderación (GET)', () => {
    service.obtenerComentariosPendientes().subscribe((comentarios) => {
      expect(comentarios.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseApi}/comentarios/pendientes`);
    expect(req.request.method).toBe('GET');
    req.flush([{ idComment: 5, content: 'Excelente empresa', status: 'PENDIENTE' }]);
  });

  it('debe enviar la aprobación o rechazo de una empresa por NIT (PUT)', () => {
    const nit = '900123456-7';
    const respuestaEsperada = 'La empresa ha sido aprobada y su acceso habilitado.';

    service.verificarEmpresa(nit, true).subscribe((respuesta) => {
      expect(respuesta).toBe(respuestaEsperada);
    });

    const req = httpMock.expectOne(`${baseApi}/empresas/${nit}/verificar`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ aprobada: true });
    req.flush(respuestaEsperada);
  });

  it('debe cerrar una oferta no apta por parte del administrador (PATCH)', () => {
    const idOffer = 4;
    const mensajeCierre = 'La oferta ha sido cerrada por el administrador.';

    service.cerrarOfertaPorAdmin(idOffer).subscribe((res) => {
      expect(res).toBe(mensajeCierre);
    });

    const req = httpMock.expectOne(`${baseApi}/ofertas/${idOffer}/cerrar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mensajeCierre);
  });

  it('debe moderar un comentario aprobándolo o rechazándolo (PATCH)', () => {
    const idComment = 10;

    service.moderarComentario(idComment, true).subscribe((res) => {
      expect(res.status).toBe('APROBADO');
    });

    const req = httpMock.expectOne(`${baseApi}/comentarios/${idComment}/moderar?aprobado=true`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ idComment: 10, status: 'APROBADO' });
  });

  it('debe subir la foto de perfil del administrador a Cloudinary (POST)', () => {
    const archivo = new File(['img'], 'admin.png', { type: 'image/png' });
    const urlEsperada = 'https://res.cloudinary.com/demo/image/upload/admin.png';

    service.subirFotoAdminCloudinary(archivo).subscribe((res) => {
      expect(res.url).toBe(urlEsperada);
    });

    const req = httpMock.expectOne(`${environment.baseUrl}/archivos/subir`);
    expect(req.request.method).toBe('POST');
    req.flush({ url: urlEsperada });
  });
});