import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { UpdatePasswordService } from './update-pasword/update.password';
import { IaSeguridadService } from './ia-seguridad/ia-seguridad';
import { Estudiante } from './estudiante/estudiante';
import { Auth } from './auth';

const API = environment.baseUrl;

/** Servicios HTTP: URL, método y cuerpo que envía cada uno. */
describe('Servicios HTTP', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('UpdatePasswordService', () => {
    it('envía el cambio de contraseña como PATCH y devuelve texto', () => {
      let respuesta = '';
      TestBed.inject(UpdatePasswordService)
        .cambiarContrasena({ email: 'a@b.co', currentPassword: 'x', newPassword: 'y' })
        .subscribe(r => (respuesta = r));
      const req = http.expectOne(`${API}/auth/cambiar-contrasena`);
      expect(req.request.method).toBe('PATCH');
      req.flush('Contraseña actualizada');
      expect(respuesta).toBe('Contraseña actualizada');
    });

    it('obtenerEmailDeSesion: sesión (email/correo/correoElectronico), luego JWT, luego vacío', () => {
      const svc = TestBed.inject(UpdatePasswordService);
      expect(svc.obtenerEmailDeSesion()).toBe('');

      localStorage.setItem('usuario_sesion', JSON.stringify({ email: 'e@x.co' }));
      expect(svc.obtenerEmailDeSesion()).toBe('e@x.co');
      localStorage.setItem('usuario_sesion', JSON.stringify({ correo: 'c@x.co' }));
      expect(svc.obtenerEmailDeSesion()).toBe('c@x.co');
      localStorage.setItem('usuario_sesion', JSON.stringify({ correoElectronico: 'ce@x.co' }));
      expect(svc.obtenerEmailDeSesion()).toBe('ce@x.co');

      localStorage.setItem('usuario_sesion', JSON.stringify({}));
      localStorage.setItem('token', `h.${btoa(JSON.stringify({ sub: 'jwt@x.co' }))}.f`);
      expect(svc.obtenerEmailDeSesion()).toBe('jwt@x.co');

      localStorage.setItem('usuario_sesion', '{corrupta');
      expect(svc.obtenerEmailDeSesion()).toBe('');
    });
  });

  describe('IaSeguridadService', () => {
    it('consulta recomendaciones y ranking', () => {
      const ia = TestBed.inject(IaSeguridadService);
      ia.recomendarOfertasEstudiante('1001').subscribe();
      ia.obtenerRankingPostulados(5).subscribe();
      http.expectOne(`${API}/ia/recomendar-ofertas/1001`).flush({});
      http.expectOne(`${API}/ia/ranking-postulados/5`).flush({});
    });
  });

  describe('Estudiante', () => {
    it('usa los endpoints "me" y el de comentarios', () => {
      const est = TestBed.inject(Estudiante);
      est.obtenerMiInformacion().subscribe();
      est.obtenerMisPostulaciones().subscribe();
      est.obtenerMisPracticas().subscribe();
      est.calificarEmpresa({ idPractice: 7, companyRating: 5, commentText: 'Bien' }).subscribe();
      est.obtenerPerfil('1001').subscribe();
      est.guardarPerfil({ documentStudent: '1001' }).subscribe();
      est.registrarEstudiante({}).subscribe();
      est.obtenerEstudiantes().subscribe();

      http.expectOne(`${API}/estudiantes/me`).flush({});
      http.expectOne(`${API}/estudiantes/me/postulaciones`).flush([]);
      http.expectOne(`${API}/estudiantes/me/practicas`).flush([]);
      const comentario = http.expectOne(`${API}/comentarios/crear`);
      expect(comentario.request.body).toEqual({ idPractice: 7, companyRating: 5, commentText: 'Bien' });
      comentario.flush({});
      http.expectOne(`${API}/registro/estudiantes/perfil/1001`).flush(null);
      http.expectOne(r => r.method === 'POST' && r.url === `${API}/registro/estudiantes/perfil`).flush({});
      http.expectOne(r => r.method === 'POST' && r.url === `${API}/registro/estudiantes`).flush({});
      http.expectOne(r => r.method === 'GET' && r.url === `${API}/registro/estudiantes`).flush([]);
    });
  });

  describe('Auth', () => {
    const tokenCon = (claims: object) => `h.${btoa(JSON.stringify(claims))}.f`;

    it('login envía las credenciales', () => {
      TestBed.inject(Auth).login('a@b.co', 'clave').subscribe();
      const req = http.expectOne(`${API}/auth/login`);
      expect(req.request.body).toEqual({ email: 'a@b.co', password: 'clave' });
      req.flush({});
    });

    it('isLoggedIn depende del token y de su expiración', () => {
      const auth = TestBed.inject(Auth);
      expect(auth.isLoggedIn()).toBe(false);
      localStorage.setItem('token', tokenCon({ exp: Date.now() / 1000 + 60 }));
      expect(auth.isLoggedIn()).toBe(true);
      localStorage.setItem('token', tokenCon({ exp: Date.now() / 1000 - 60 }));
      expect(auth.isLoggedIn()).toBe(false);
      localStorage.setItem('token', tokenCon({}));
      expect(auth.isLoggedIn()).toBe(true);
      localStorage.setItem('token', 'basura');
      expect(auth.isLoggedIn()).toBe(false);
    });

    it('rutaInicio según el rol y logout limpia la sesión', () => {
      const auth = TestBed.inject(Auth);
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const conRol = (userRol: string) => localStorage.setItem('usuario_sesion', JSON.stringify({ userRol }));

      expect(auth.rutaInicio()).toBe('/');
      conRol('administrador');
      expect(auth.rutaInicio()).toBe('/panel-administrador');
      conRol('empresa');
      expect(auth.rutaInicio()).toBe('/panel-empresa');
      conRol('estudiante');
      expect(auth.rutaInicio()).toBe('/ofertas');
      expect(auth.getRol()).toBe('estudiante');

      localStorage.setItem('token', 't');
      localStorage.setItem('nitEmpresa', '900');
      auth.logout();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('nitEmpresa')).toBeNull();
      expect(auth.getUsuarioActual()).toBeNull();
      expect(navegar).toHaveBeenCalledWith(['/login']);
    });
  });
});
