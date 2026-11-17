import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { PanelAdminStore } from '../../panel-administrador.store';

/** Vista "Por Aprobar": solicitudes de empresas pendientes de verificación. */
@Component({
  selector: 'app-admin-pendientes',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './admin-pendientes.html'
})
export class AdminPendientes {
  protected readonly store = inject(PanelAdminStore);
}
