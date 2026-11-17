import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormsModule } from '@angular/forms';
import { PanelEmpresaStore } from '../../panel-empresa.store';

/** Vista "Mis Ofertas": tabla de convocatorias con buscador. */
@Component({
  selector: 'app-empresa-mis-ofertas',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './empresa-mis-ofertas.html'
})
export class EmpresaMisOfertas {
  protected readonly store = inject(PanelEmpresaStore);

  readonly filtro = signal('');

  readonly ofertasFiltradas = computed(() => {
    const busq = this.filtro().trim().toLowerCase();
    const ofertas = this.store.misOfertas();
    if (!busq) return ofertas;
    return ofertas.filter(o =>
      o.practiceName?.toLowerCase().includes(busq) ||
      o.profession?.toLowerCase().includes(busq) ||
      o.modality?.toLowerCase().includes(busq)
    );
  });
}
