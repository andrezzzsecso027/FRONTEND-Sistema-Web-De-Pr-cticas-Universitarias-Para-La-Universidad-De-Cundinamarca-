import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { PanelAdminStore } from '../../panel-administrador.store';

/*
 * Modales de inspección del panel de administración. Se abren desde varias vistas
 * (p. ej. el perfil del estudiante desde Estudiantes, desde una Práctica o desde el
 * Historial de ofertas), por eso su estado vive en PanelAdminStore y se montan una
 * sola vez en el shell. Cada uno se muestra solo cuando su signal tiene valor.
 */

/** Modal 1: información legal de la empresa + aprobar / rechazar / inhabilitar. */
@Component({
  selector: 'app-admin-empresa-modal',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './admin-empresa-modal.html'
})
export class AdminEmpresaModal {
  protected readonly store = inject(PanelAdminStore);
}

/** Modal 2: datos del estudiante y su hoja de vida extendida. */
@Component({
  selector: 'app-admin-estudiante-modal',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './admin-estudiante-modal.html'
})
export class AdminEstudianteModal {
  protected readonly store = inject(PanelAdminStore);
}

/** Modal 3: expediente de la práctica (oferta, fechas, contrato PDF). */
@Component({
  selector: 'app-admin-practica-modal',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './admin-practica-modal.html'
})
export class AdminPracticaModal {
  protected readonly store = inject(PanelAdminStore);

  verHojaDeVida(): void {
    const p = this.store.practicaModal();
    this.store.practicaModal.set(null);
    if (p) this.store.abrirPerfilEstudiantePorDocumento(p.studentDocument, p.studentFullName, p.studentProgram);
  }
}

/** Modal 4: estudiantes seleccionados en una oferta del historial. */
@Component({
  selector: 'app-admin-seleccionados-modal',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './admin-seleccionados-modal.html'
})
export class AdminSeleccionadosModal {
  protected readonly store = inject(PanelAdminStore);

  verPerfil(sel: any): void {
    this.store.ofertaHistorialModal.set(null);
    this.store.abrirPerfilEstudiantePorDocumento(
      sel.studentDocument || sel.documentStudent || '',
      sel.studentFullName,
      sel.studentAcademicProgram || sel.academicProgram
    );
  }
}
