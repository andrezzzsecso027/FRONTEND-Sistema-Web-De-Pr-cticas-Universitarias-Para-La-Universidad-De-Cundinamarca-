import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PostulacionService } from './postulacion';
import { environment } from '../../../../environments/environment';

describe('PostulacionService (Pruebas Unitarias)', () => {
  let service: PostulacionService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.baseUrl}${environment.endpoints.postulaciones}`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [PostulacionService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PostulacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe registrar la postulación de un estudiante a una oferta (POST)', () => {
    const payload = { idOffer: 4, documentNumberStudent: '1003558974' };

    service.aplicarAOferta(payload).subscribe((res) => {
      expect(res.statusPostulation).toBe('EN_REVISION');
    });

    const req = httpMock.expectOne(`${apiUrl}/aplicar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ idPostulation: 1, ...payload, statusPostulation: 'EN_REVISION' });
  });

  it('debe obtener la lista de estudiantes postulados a una oferta (GET)', () => {
    service.verPostuladosPorOferta(4).subscribe((lista) => {
      expect(lista.length).toBe(1);
      expect(lista[0].studentFullName).toBe('Brayan Alfaro');
    });

    const req = httpMock.expectOne(`${apiUrl}/oferta/4`);
    expect(req.request.method).toBe('GET');
    req.flush([{ idPostulation: 1, studentFullName: 'Brayan Alfaro', statusPostulation: 'ACEPTADA' }]);
  });

  it('debe actualizar el estado de una postulación con observaciones (PATCH)', () => {
    service.cambiarEstadoPostulacion(1, 'ACEPTADA', 'Cumple con el perfil').subscribe((res) => {
      expect(res.statusPostulation).toBe('ACEPTADA');
    });

    const req = httpMock.expectOne(`${apiUrl}/1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ newStatus: 'ACEPTADA', observations: 'Cumple con el perfil' });
    req.flush({ idPostulation: 1, statusPostulation: 'ACEPTADA' });
  });

  it('debe consultar el historial de cambios de estado de una postulación (GET)', () => {
    service.verHistorialPostulacion(1).subscribe((historial) => {
      expect(historial.length).toBe(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/1/historial`);
    expect(req.request.method).toBe('GET');
    req.flush([{ previousStatus: 'EN_REVISION', newStatus: 'ACEPTADA' }]);
  });
});