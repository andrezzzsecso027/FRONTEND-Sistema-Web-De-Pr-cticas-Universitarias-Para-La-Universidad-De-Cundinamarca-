import { Component, computed, inject, signal } from '@angular/core';
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

  readonly busqueda = signal('');
  readonly modalidad = signal('TODAS');

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
