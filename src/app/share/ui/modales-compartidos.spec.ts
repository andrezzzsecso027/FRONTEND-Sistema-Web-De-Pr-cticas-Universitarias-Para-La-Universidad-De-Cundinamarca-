import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CambiarPasswordModal } from './cambiar-password-modal/cambiar-password-modal';
import { ConfirmarCierreSesionModal } from './confirmar-cierre-sesion/confirmar-cierre-sesion';
import { UpdatePasswordService } from '../../core/services/update-pasword/update.password';
import { ConfirmarCierreSesion } from '../../core/services/sesion/confirmar-cierre-sesion';
import { Auth } from '../../core/services/auth';

describe('CambiarPasswordModal', () => {
  let cambiarContrasena: ReturnType<typeof vi.fn>;

  const crear = () => {
    const fixture = TestBed.createComponent(CambiarPasswordModal);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    cambiarContrasena = vi.fn(() => of('Contraseña actualizada'));
    TestBed.configureTestingModule({
      imports: [CambiarPasswordModal],
      providers: [{ provide: UpdatePasswordService, useValue: { cambiarContrasena, obtenerEmailDeSesion: () => 'sesion@x.co' } }]
    });
  });

  it('valida campos vacíos, confirmación distinta y longitud mínima', () => {
    const modal = crear();
    modal.guardar();
    expect(modal.mensajeError).toContain('obligatorios');

    Object.assign(modal, { passwordActual: 'a', passwordNueva: '123456', passwordConfirmar: '654321' });
    modal.guardar();
    expect(modal.mensajeError).toContain('no coinciden');

    Object.assign(modal, { passwordNueva: '123', passwordConfirmar: '123' });
    modal.guardar();
    expect(modal.mensajeError).toContain('al menos 6');
    expect(cambiarContrasena).not.toHaveBeenCalled();
  });

  it('cambia la contraseña con el correo de la sesión y limpia el formulario', () => {
    const modal = crear();
    Object.assign(modal, { passwordActual: 'vieja', passwordNueva: 'nueva123', passwordConfirmar: 'nueva123' });
    modal.guardar();
    expect(cambiarContrasena).toHaveBeenCalledWith({ email: 'sesion@x.co', currentPassword: 'vieja', newPassword: 'nueva123' });
    expect(modal.mensajeExito).toBe('Contraseña actualizada');
    expect(modal.passwordNueva).toBe('');
  });

  it('muestra el error del backend o uno por defecto', () => {
    const modal = crear();
    const llenar = () => Object.assign(modal, { passwordActual: 'mal', passwordNueva: 'nueva123', passwordConfirmar: 'nueva123' });
    cambiarContrasena.mockReturnValue(throwError(() => ({ error: 'Bloqueado' })));
    llenar();
    modal.guardar();
    expect(modal.mensajeError).toBe('Bloqueado');

    cambiarContrasena.mockReturnValue(throwError(() => ({ error: null })));
    llenar();
    modal.guardar();
    expect(modal.mensajeError).toBe('La contraseña actual es incorrecta.');
    expect(modal.cargando).toBe(false);
  });
});

describe('ConfirmarCierreSesionModal', () => {
  let confirmacion: ConfirmarCierreSesion;
  let usuario: { email: string } | null;

  const render = () => {
    const fixture = TestBed.createComponent(ConfirmarCierreSesionModal);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    usuario = { email: 'ana@ucundinamarca.edu.co' };
    TestBed.configureTestingModule({
      imports: [ConfirmarCierreSesionModal],
      providers: [{ provide: Auth, useValue: { getUsuarioActual: () => usuario } }]
    });
    confirmacion = TestBed.inject(ConfirmarCierreSesion);
  });

  it('no muestra nada mientras no se pregunta', () => {
    expect((render().nativeElement as HTMLElement).querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('muestra el correo y "Cerrar sesión" responde true', async () => {
    const respuesta = confirmacion.preguntar();
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ana@ucundinamarca.edu.co');

    el.querySelector<HTMLButtonElement>('.ui-btn--danger')!.click();
    expect(await respuesta).toBe(true);
    expect(confirmacion.abierto()).toBe(false);
  });

  it('"Quedarme", clic afuera y Escape responden false', async () => {
    usuario = null;
    let respuesta = confirmacion.preguntar();
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('tu cuenta');
    el.querySelector<HTMLButtonElement>('.ui-btn--secondary')!.click();
    expect(await respuesta).toBe(false);

    respuesta = confirmacion.preguntar();
    fixture.detectChanges();
    el.querySelector<HTMLElement>('.ui-modal-backdrop')!.click();
    expect(await respuesta).toBe(false);

    respuesta = confirmacion.preguntar();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(await respuesta).toBe(false);

    // Escape sin diálogo abierto no hace nada
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(confirmacion.abierto()).toBe(false);
  });

  it('una segunda pregunta descarta la anterior como "no"', async () => {
    const primera = confirmacion.preguntar();
    const segunda = confirmacion.preguntar();
    expect(await primera).toBe(false);
    confirmacion.responder(true);
    expect(await segunda).toBe(true);
  });
});
