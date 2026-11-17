import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../share/ui/icon/icon';
import { PanelEstudianteStore } from '../panel-estudiante/panel-estudiante.store';

/**
 * Portal del estudiante — vista "Mis postulaciones". Antes siempre mostraba una lista vacía
 * porque no existía el endpoint; ahora lee GET /api/estudiantes/me/postulaciones.
 */
@Component({
  selector: 'app-mis-postulaciones',
  standalone: true,
  imports: [CommonModule, RouterLink, Icon],
  templateUrl: './mis-postulaciones.html',
  host: { class: 'ui-view' }
})
export class MisPostulaciones {
  protected readonly store = inject(PanelEstudianteStore);
}
