import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { PanelAdminStore } from '../../panel-administrador.store';

/** Vista "En Prácticas": alumnos vinculados, contrato PDF y estado de seguimiento. */
@Component({
  selector: 'app-admin-practicas',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './admin-practicas.html'
})
export class AdminPracticas {
  protected readonly store = inject(PanelAdminStore);
}
