import { Injectable, OnDestroy, signal } from '@angular/core';

/**
 * Cierra la sesión por inactividad. Antes esta lógica estaba copiada en cada panel.
 *
 * Uso: proveerlo en el componente del panel (`providers: [Inactividad]`), llamar a
 * `iniciar()` en ngOnInit y a `reiniciar()` desde los @HostListener de actividad.
 * Al expirar limpia el localStorage y `expirada()` pasa a true para mostrar el aviso.
 */
@Injectable()
export class Inactividad implements OnDestroy {
  /** true cuando la sesión expiró (para mostrar el modal de aviso). */
  readonly expirada = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private limiteMs = 10 * 60 * 1000;
  private alExpirar: () => void = () => {};
  private clavesExtra: string[] = [];

  /**
   * @param alExpirar acción a ejecutar al expirar (p. ej. redirigir al login tras unos segundos)
   * @param clavesExtra claves adicionales de localStorage a borrar (p. ej. datos cacheados del panel)
   */
  iniciar(alExpirar: () => void, clavesExtra: string[] = [], limiteMs = this.limiteMs): void {
    this.alExpirar = alExpirar;
    this.clavesExtra = clavesExtra;
    this.limiteMs = limiteMs;
    this.reiniciar();
  }

  reiniciar(): void {
    if (this.expirada()) return;
    this.detener();
    this.timer = setTimeout(() => this.expirar(), this.limiteMs);
  }

  detener(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.detener();
  }

  private expirar(): void {
    ['token', 'usuario_sesion', ...this.clavesExtra].forEach((k) => localStorage.removeItem(k));
    this.expirada.set(true);
    this.alExpirar();
  }
}
