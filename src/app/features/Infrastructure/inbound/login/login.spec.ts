import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { Auth } from '../../../../core/services/auth';
import { environment } from '../../../../../environments/environment';

describe('Login', () => {
  let login: ReturnType<typeof vi.fn>;
  let navegar: ReturnType<typeof vi.spyOn>;
  let http: HttpTestingController;

  const crear = () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture.componentInstance;
  };
  const conCredenciales = (c: Login, email = 'ana@ucundinamarca.edu.co') => {
    c.loginForm.setValue({ email, password: 'Clave123*' });
    return c;
  };

  beforeEach(() => {
    login = vi.fn();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: Auth, useValue: { login, isLoggedIn: () => false, getRol: () => null, getUsuarioActual: () => null } }
      ]
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('no envía un formulario inválido', () => {
    const c = crear();
    c.onSubmit();
    expect(login).not.toHaveBeenCalled();
    expect(c.loginForm.touched).toBe(true);
  });

  it.each([
    ['administrador', '/panel-administrador'],
    ['empresa', '/panel-empresa'],
    ['estudiante', '/ofertas'],
    ['otro', '/']
  ])('con rol %s guarda la sesión y navega a %s', (rol, ruta) => {
    login.mockReturnValue(of({ idUser: 1, email: 'a@b.co', userRol: rol, token: 'tok' }));
    conCredenciales(crear()).onSubmit();
    expect(localStorage.getItem('token')).toBe('tok');
    expect(navegar).toHaveBeenCalledWith([ruta]);
  });

  it.each([
    [{ status: 403 }, 'otra@empresa.co', 'pendiente de verificación'],
    [{ status: 401 }, 'a@b.co', 'incorrectos'],
    [{ status: 0 }, 'a@b.co', 'No se pudo conectar'],
    [{ status: 500 }, 'a@b.co', 'Error al iniciar sesión']
  ])('error %o muestra el mensaje adecuado', (err, email, mensaje) => {
    login.mockReturnValue(throwError(() => err));
    const c = conCredenciales(crear(), email);
    c.onSubmit();
    expect(c.mensajeError).toContain(mensaje);
    expect(c.cargando).toBe(false);
  });

  describe('cuenta estudiantil sin activar', () => {
    let c: Login;

    beforeEach(() => {
      login.mockReturnValue(throwError(() => ({ status: 403 })));
      c = conCredenciales(crear());
      c.onSubmit();
    });

    it('abre el modal para ingresar el código', () => {
      expect(c.mostrarModalVerificacion).toBe(true);
      expect(c.correoParaVerificar).toBe('ana@ucundinamarca.edu.co');
    });

    it('exige 6 dígitos', () => {
      c.codigoVerificacion = '12';
      c.confirmarCodigoDesdeLogin();
      expect(c.mensajeVerificacionError).toContain('6 dígitos');
    });

    it('si el código es correcto activa la cuenta y reintenta el login', () => {
      vi.useFakeTimers();
      c.codigoVerificacion = '123456';
      c.confirmarCodigoDesdeLogin();
      const req = http.expectOne(`${environment.baseUrl}/estudiantes/auth/verificar`);
      expect(req.request.body).toEqual({ email: 'ana@ucundinamarca.edu.co', code: '123456' });
      req.flush('Cuenta activada');
      expect(c.mensajeVerificacionExito).toBe('Cuenta activada');

      login.mockReturnValue(of({ idUser: 1, email: 'a', userRol: 'estudiante', token: 't' }));
      vi.advanceTimersByTime(1200);
      expect(c.mostrarModalVerificacion).toBe(false);
      expect(navegar).toHaveBeenCalledWith(['/ofertas']);
      vi.useRealTimers();
    });

    it('si el código es incorrecto muestra el error del backend o uno genérico', () => {
      c.codigoVerificacion = '000000';
      c.confirmarCodigoDesdeLogin();
      http.expectOne(`${environment.baseUrl}/estudiantes/auth/verificar`).flush('Código expirado', { status: 400, statusText: 'Bad' });
      expect(c.mensajeVerificacionError).toBe('Código expirado');

      c.confirmarCodigoDesdeLogin();
      http.expectOne(`${environment.baseUrl}/estudiantes/auth/verificar`).flush('', { status: 400, statusText: 'Bad' });
      expect(c.mensajeVerificacionError).toContain('incorrecto o ha expirado');
    });
  });
});
