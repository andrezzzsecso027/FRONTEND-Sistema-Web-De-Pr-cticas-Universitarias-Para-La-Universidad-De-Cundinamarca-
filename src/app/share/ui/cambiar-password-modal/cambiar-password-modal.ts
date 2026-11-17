import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UpdatePasswordService } from '../../../core/services/update-pasword/update.password';
import { Icon } from '../icon/icon';

/**
 * Modal reutilizable para cambiar la contraseña (empresa, administrador, estudiante).
 * Usa las clases del sistema de diseño global (ui-modal, ui-field...).
 *
 * El backend toma el correo del token JWT; `email` solo se envía por compatibilidad.
 */
@Component({
  selector: 'app-cambiar-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './cambiar-password-modal.html'
})
export class CambiarPasswordModal {
  @Input() email = '';
  @Input() etiqueta = 'SEGURIDAD DE LA CUENTA';
  @Output() cerrar = new EventEmitter<void>();

  private readonly updatePasswordService = inject(UpdatePasswordService);
  private readonly cdr = inject(ChangeDetectorRef);

  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  mensajeExito = '';
  mensajeError = '';
  cargando = false;

  guardar(): void {
    this.mensajeExito = '';
    this.mensajeError = '';

    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      this.mensajeError = 'Todos los campos son obligatorios.';
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.mensajeError = 'La nueva contraseña y su confirmación no coinciden.';
      return;
    }
    if (this.passwordNueva.length < 6) {
      this.mensajeError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.cargando = true;
    this.updatePasswordService.cambiarContrasena({
      email: this.email || this.updatePasswordService.obtenerEmailDeSesion(),
      currentPassword: this.passwordActual,
      newPassword: this.passwordNueva
    }).subscribe({
      next: (res) => {
        this.cargando = false;
        this.mensajeExito = res || 'Contraseña actualizada exitosamente.';
        this.passwordActual = '';
        this.passwordNueva = '';
        this.passwordConfirmar = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = typeof err.error === 'string' && err.error
          ? err.error
          : 'La contraseña actual es incorrecta.';
        this.cdr.detectChanges();
      }
    });
  }
}
