import { Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../../share/ui/icon/icon';
import { MiPractica } from '../../../../core/services/estudiante/estudiante';
import { PanelEstudianteStore } from '../panel-estudiante/panel-estudiante.store';

export const MAX_COMENTARIO = 1000;
const ETIQUETAS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];
const PASOS_TECLADO: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };

/**
 * Modal para que el estudiante califique (1–5 estrellas) y comente a la empresa de una práctica
 * FINALIZADA. El comentario queda pendiente hasta que un administrador lo modere.
 */
@Component({
  selector: 'app-evaluar-empresa-modal',
  standalone: true,
  imports: [FormsModule, Icon],
  templateUrl: './evaluar-empresa-modal.html'
})
export class EvaluarEmpresaModal {
  @Input({ required: true }) practica!: MiPractica;
  @Output() cerrar = new EventEmitter<void>();

  protected readonly store = inject(PanelEstudianteStore);
  protected readonly estrellas = [1, 2, 3, 4, 5];
  protected readonly maxComentario = MAX_COMENTARIO;

  protected readonly calificacion = signal(0);
  protected readonly hover = signal(0);
  protected comentario = '';
  protected readonly error = signal('');

  protected etiqueta(valor: number): string {
    return valor > 0 ? ETIQUETAS[valor - 1] : 'Selecciona una calificación';
  }

  protected get valido(): boolean {
    const texto = this.comentario.trim();
    return this.calificacion() >= 1 && texto.length > 0 && texto.length <= MAX_COMENTARIO;
  }

  /** Flechas izquierda/derecha cambian la calificación (patrón radiogroup accesible). */
  protected moverConTeclado(evento: KeyboardEvent): void {
    const delta = PASOS_TECLADO[evento.key];
    if (!delta) return;
    evento.preventDefault();
    this.calificacion.set(Math.min(5, Math.max(1, (this.calificacion() || 0) + delta)));
  }

  protected enviar(): void {
    this.error.set('');
    if (!this.valido) {
      this.error.set('Elige de 1 a 5 estrellas y cuéntanos cómo fue tu experiencia.');
      return;
    }
    this.store.calificarEmpresa(
      { idPractice: this.practica.idPractice, companyRating: this.calificacion(), commentText: this.comentario.trim() },
      (ok, mensaje) => ok ? this.cerrar.emit() : this.error.set(mensaje ?? '')
    );
  }

  @HostListener('document:keydown.escape')
  protected cerrarConEscape(): void {
    if (!this.store.enviandoCalificacion()) this.cerrar.emit();
  }
}
