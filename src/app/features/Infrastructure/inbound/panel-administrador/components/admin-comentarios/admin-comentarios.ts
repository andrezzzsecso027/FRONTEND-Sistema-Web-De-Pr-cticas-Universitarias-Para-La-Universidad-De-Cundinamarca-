import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { PanelAdminStore } from '../../panel-administrador.store';

/** Vista "Comentarios": moderación de reseñas de practicantes sobre las empresas. */
@Component({
  selector: 'app-admin-comentarios',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './admin-comentarios.html'
})
export class AdminComentarios {
  protected readonly store = inject(PanelAdminStore);
}
