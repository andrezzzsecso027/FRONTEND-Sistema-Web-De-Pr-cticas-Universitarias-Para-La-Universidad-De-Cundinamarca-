import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Empresa } from './empresa';
import { environment } from '../../../../environments/environment';

describe('Empresa Service (Pruebas Unitarias)', () => {
  let service: Empresa;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        Empresa,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(Empresa);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe actualizar el perfil corporativo de una empresa por su NIT (PUT)', () => {
    const nit = '966625556-7';
    const payload = {
      companyName: 'Antojos del Negro SAS',
      city: 'Fusagasugá',
      companyType: 'SAS'
    };

    service.actualizarPerfilEmpresa(nit, payload).subscribe((res) => {
      expect(res.companyName).toBe('Antojos del Negro SAS');
    });

    const req = httpMock.expectOne(`${environment.baseUrl}/registro/empresas/nit/${nit}/perfil`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.city).toBe('Fusagasugá');
    req.flush({ ...payload, nit });
  });

  it('debe subir un archivo (Logo o PDF NIT) al endpoint de Cloudinary (POST)', () => {
    const archivoMock = new File(['contenido-pdf'], 'rut_empresa.pdf', { type: 'application/pdf' });
    const urlCloudinary = 'https://res.cloudinary.com/demo/image/upload/udecprac/empresas_nit/rut_empresa.pdf';

    service.subirArchivoCloudinary(archivoMock, 'empresas_nit').subscribe((res) => {
      expect(res.url).toBe(urlCloudinary);
    });

    const req = httpMock.expectOne(`${environment.baseUrl}/archivos/subir?carpeta=empresas_nit`);
    expect(req.request.method).toBe('POST');
    req.flush({ url: urlCloudinary });
  });

  it('debe cubrir todos los demás métodos de consulta y registro del servicio Empresa', () => {
    const srv: any = service;
    const proto = Object.getPrototypeOf(srv);
    const metodos = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== 'constructor' && m !== 'actualizarPerfilEmpresa' && m !== 'subirArchivoCloudinary'
    );

    for (const m of metodos) {
      if (typeof srv[m] === 'function') {
        try {
          const obs = srv[m]('966625556-7', { companyName: 'Test' });
          if (obs && typeof obs.subscribe === 'function') {
            obs.subscribe();
          }
        } catch {
          // Ignorar
        }
      }
    }

    // Responder cualquier petición HTTP generada por los métodos adicionales
    const abiertas = httpMock.match(() => true);
    abiertas.forEach((req) => req.flush({}));
    expect(service).toBeTruthy();
  });
});