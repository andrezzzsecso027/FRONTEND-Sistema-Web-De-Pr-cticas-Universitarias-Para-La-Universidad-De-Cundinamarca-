import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { invitadoGuard } from './invitado.guard';
import { ConfirmarCierreSesion } from '../services/sesion/confirmar-cierre-sesion';

/** JWT mínimo con exp en el futuro (el guard solo lee el claim exp). */
const tokenValido = () => `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.y`;

describe('invitadoGuard', () => {
  let confirmacion: ConfirmarCierreSesion;
  let router: Router;

  const ejecutar = () =>
    TestBed.runInInjectionContext(() => invitadoGuard({} as never, {} as never)) as Promise<boolean | UrlTree>;

  const iniciarSesion = (rol: string) => {
    localStorage.setItem('token', tokenValido());
    localStorage.setItem('usuario_sesion', JSON.stringify({ email: 'a@b.co', userRol: rol }));
  };

  beforeEach(() => {
    // En Vitest/jsdom localStorage no está disponible: se usa uno en memoria.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k)
    });
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    confirmacion = TestBed.inject(ConfirmarCierreSesion);
    router = TestBed.inject(Router);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('deja pasar sin preguntar cuando no hay sesión', async () => {
    expect(await ejecutar()).toBe(true);
    expect(confirmacion.abierto()).toBe(false);
  });

  it('con sesión pregunta y, si confirma, cierra la sesión y deja pasar', async () => {
    iniciarSesion('empresa');
    localStorage.setItem('nitEmpresa', '900');
    const resultado = ejecutar();
    expect(confirmacion.abierto()).toBe(true);

    confirmacion.responder(true);

    expect(await resultado).toBe(true);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('nitEmpresa')).toBeNull();
  });

  it('si cancela en la primera carga, redirige al panel de su rol y conserva la sesión', async () => {
    iniciarSesion('administrador');
    const resultado = ejecutar();
    confirmacion.responder(false);

    const valor = await resultado;
    expect(router.serializeUrl(valor as UrlTree)).toBe('/panel-administrador');
    expect(localStorage.getItem('token')).not.toBeNull();
  });

  it('si cancela tras haber navegado (flecha atrás), cancela la navegación', async () => {
    iniciarSesion('estudiante');
    Object.defineProperty(router, 'navigated', { value: true });
    const resultado = ejecutar();
    confirmacion.responder(false);

    expect(await resultado).toBe(false);
  });
});
