import { Component, HostListener, inject } from '@angular/core';
import { ConfirmarCierreSesion } from '../../../core/services/sesion/confirmar-cierre-sesion';
import { Auth } from '../../../core/services/auth';
import { Icon } from '../icon/icon';

/** Diálogo "¿Cerrar sesión?" que se muestra al volver a una página pública con la sesión abierta. */
@Component({
  selector: 'app-confirmar-cierre-sesion',
  standalone: true,
  imports: [Icon],
  template: `
    @if (confirmacion.abierto()) {
      <div class="ui-modal-backdrop" (click)="confirmacion.responder(false)">
        <div class="ui-modal ui-modal--sm" role="alertdialog" aria-modal="true"
             aria-labelledby="cierre-sesion-titulo" aria-describedby="cierre-sesion-texto"
             (click)="$event.stopPropagation()">
          <div class="ui-modal__header">
            <div>
              <h3 id="cierre-sesion-titulo">¿Cerrar sesión?</h3>
              <p id="cierre-sesion-texto">
                Estás saliendo de tu panel. Si continúas, se cerrará la sesión de
                <strong>{{ correo }}</strong>.
              </p>
            </div>
          </div>
          <div class="ui-modal__footer">
            <button type="button" class="ui-btn ui-btn--secondary" (click)="confirmacion.responder(false)" autofocus>
              Quedarme en mi panel
            </button>
            <button type="button" class="ui-btn ui-btn--danger" (click)="confirmacion.responder(true)">
              <ui-icon name="log-out" /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmarCierreSesionModal {
  protected readonly confirmacion = inject(ConfirmarCierreSesion);
  private readonly auth = inject(Auth);

  protected get correo(): string {
    return this.auth.getUsuarioActual()?.email ?? 'tu cuenta';
  }

  @HostListener('document:keydown.escape')
  cancelarConEscape(): void {
    if (this.confirmacion.abierto()) this.confirmacion.responder(false);
  }
}
