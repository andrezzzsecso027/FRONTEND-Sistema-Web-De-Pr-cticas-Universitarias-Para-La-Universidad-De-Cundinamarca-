import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { Auth } from '../services/auth';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const logout = vi.fn();
  const api = environment.baseUrl;

  beforeEach(() => {
    // En este entorno de Vitest/jsdom localStorage no está disponible: usamos uno en memoria
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear()
    });
    logout.mockReset();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Auth, useValue: { logout } }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  it('agrega el header Bearer a las peticiones de nuestra API', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    http.get(`${api}/admin/estudiantes`).subscribe();
    const req = httpMock.expectOne(`${api}/admin/estudiantes`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    req.flush([]);
  });

  it('no envía el token a APIs externas', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    const externa = 'https://raw.githubusercontent.com/x/colombia.json';
    http.get(externa).subscribe();
    const req = httpMock.expectOne(externa);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('no agrega header si no hay sesión', () => {
    http.get(`${api}/ofertas/estudiantes`).subscribe();
    const req = httpMock.expectOne(`${api}/ofertas/estudiantes`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('cierra la sesión cuando la API responde 401 (token vencido)', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    http.get(`${api}/admin/estudiantes`).subscribe({ error: () => {} });
    httpMock.expectOne(`${api}/admin/estudiantes`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(logout).toHaveBeenCalled();
  });

  it('NO cierra la sesión por un 401 en /auth (contraseña actual incorrecta)', () => {
    localStorage.setItem('token', 'abc.def.ghi');
    http.patch(`${api}/auth/cambiar-contrasena`, {}).subscribe({ error: () => {} });
    httpMock.expectOne(`${api}/auth/cambiar-contrasena`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(logout).not.toHaveBeenCalled();
  });
});
