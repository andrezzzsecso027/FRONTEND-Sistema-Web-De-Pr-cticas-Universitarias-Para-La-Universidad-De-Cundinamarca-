import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { PanelEmpresaStore } from '../../panel-empresa.store';

/** Vista "Inicio": bienvenida, métricas y últimas convocatorias. Solo lectura del store. */
@Component({
  selector: 'app-empresa-inicio',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './empresa-inicio.html',
  host: { class: 'ui-view' }
})
export class EmpresaInicio {
  protected readonly store = inject(PanelEmpresaStore);
}
