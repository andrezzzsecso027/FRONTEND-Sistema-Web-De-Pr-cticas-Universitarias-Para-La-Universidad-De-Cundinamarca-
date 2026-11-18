import { Injectable, signal } from '@angular/core';

/**
 * Pregunta al usuario si quiere cerrar sesión cuando, estando logueado, intenta volver
 * a una página pública (login, registro, inicio), p. ej. con la flecha "atrás" del navegador.
 *
 * El guard `invitadoGuard` llama a `preguntar()` y espera la respuesta; el modal
 * `<app-confirmar-cierre-sesion>` (montado en app.html) muestra el diálogo y llama a `responder()`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmarCierreSesion {
  /** true mientras el diálogo está visible. */
  readonly abierto = signal(false);

  private resolver: ((cerrar: boolean) => void) | null = null;

  preguntar(): Promise<boolean> {
    // Si ya había una pregunta pendiente (doble clic en "atrás"), se descarta como "no".
    this.resolver?.(false);
    this.abierto.set(true);
    return new Promise<boolean>((resolve) => (this.resolver = resolve));
  }

  responder(cerrar: boolean): void {
    this.abierto.set(false);
    const resolver = this.resolver;
    this.resolver = null;
    resolver?.(cerrar);
  }
}
