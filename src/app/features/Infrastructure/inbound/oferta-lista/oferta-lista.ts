import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../share/ui/icon/icon';
import { PanelEstudianteStore } from '../panel-estudiante/panel-estudiante.store';

/** Portal del estudiante — vista "Ofertas": catálogo de ofertas abiertas, búsqueda y recomendación IA. */
@Component({
  selector: 'app-oferta-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Icon],
  templateUrl: './oferta-lista.html',
  host: { class: 'ui-view' }
})
export class OfertaLista {
  protected readonly store = inject(PanelEstudianteStore);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly busqueda = signal('');
  readonly modalidad = signal('TODAS');

  /** Oferta resaltada al llegar desde una recomendación de la IA. */
  readonly resaltadaId = signal<number | null>(null);
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    // Al elegir una recomendación: quitar filtros que la oculten, desplazarse hasta ella y resaltarla.
    afterRenderEffect(() => {
      const id = this.store.ofertaResaltadaId();
      if (id === null || this.store.cargandoOfertas()) return;
      untracked(() => {
        this.busqueda.set('');
        this.modalidad.set('TODAS');
        this.resaltadaId.set(id);
        this.store.ofertaResaltadaId.set(null);
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => this.resaltadaId.set(null), 4000);
        // Tras quitar los filtros la tarjeta puede no estar pintada aún: se busca en el siguiente cuadro.
        requestAnimationFrame(() => {
          const tarjeta = this.host.nativeElement.querySelector<HTMLElement>(`#oferta-${id}`);
          tarjeta?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          tarjeta?.focus({ preventScroll: true });
        });
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  readonly ofertasFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const mod = this.modalidad();
    return this.store.ofertas().filter(o =>
      (mod === 'TODAS' || o.modality === mod) &&
      (!q || [o.practiceName, o.profession, o.location, o.practiceDescription].some(t => t?.toLowerCase().includes(q)))
    );
  });

  formatearSalario(salario: number): string {
    if (!salario) return 'Sin apoyo económico';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(salario);
  }
}
