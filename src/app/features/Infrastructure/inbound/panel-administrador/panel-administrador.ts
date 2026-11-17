import { Component, HostListener, OnInit, ViewEncapsulation, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Inactividad } from '../../../../core/services/sesion/inactividad';
import { CambiarPasswordModal } from '../../../../share/ui/cambiar-password-modal/cambiar-password-modal';
import { Icon } from '../../../../share/ui/icon/icon';
import { PanelAdminStore, VistaAdmin } from './panel-administrador.store';
import { AdminPendientes } from './components/admin-pendientes/admin-pendientes';
import { AdminEmpresas } from './components/admin-empresas/admin-empresas';
import { AdminEstudiantes } from './components/admin-estudiantes/admin-estudiantes';
import { AdminOfertas } from './components/admin-ofertas/admin-ofertas';
import { AdminPracticas } from './components/admin-practicas/admin-practicas';
import { AdminComentarios } from './components/admin-comentarios/admin-comentarios';
import {
  AdminEmpresaModal,
  AdminEstudianteModal,
  AdminPracticaModal,
  AdminSeleccionadosModal
} from './components/admin-modales/admin-modales';

const ENCABEZADOS: Record<VistaAdmin, { titulo: string; descripcion: string }> = {
  pendientes: {
    titulo: 'Solicitudes de empresas',
    descripcion: 'Revisa el registro legal de cada organización antes de autorizar su acceso a la plataforma.'
  },
  empresas: {
    titulo: 'Empresas aprobadas',
    descripcion: 'Directorio de organizaciones verificadas y activas en UdecPrac.'
  },
  estudiantes: {
    titulo: 'Estudiantes',
    descripcion: 'Estudiantes registrados en las sedes y programas académicos de la UdeC.'
  },
  ofertas: {
    titulo: 'Ofertas de práctica',
    descripcion: 'Supervisa las convocatorias abiertas y consulta el historial de ofertas cerradas.'
  },
  practicas: {
    titulo: 'Prácticas en curso',
    descripcion: 'Practicantes vinculados, estado de su contrato y expediente documental.'
  },
  comentarios: {
    titulo: 'Moderación de reseñas',
    descripcion: 'Aprueba o rechaza las calificaciones de los practicantes antes de publicarlas.'
  }
};

/**
 * Shell del panel de administración: barra lateral de navegación, encabezado de la sección,
 * métricas, alertas, cierre por inactividad, selector de vistas y modales.
 * Cada vista es un componente en ./components y el estado compartido vive en PanelAdminStore.
 * Los estilos vienen del sistema de diseño global (src/styles/_ui.scss, clases `ui-*`).
 */
@Component({
  selector: 'app-panel-administrador',
  standalone: true,
  imports: [
    CommonModule,
    Icon,
    CambiarPasswordModal,
    AdminPendientes,
    AdminEmpresas,
    AdminEstudiantes,
    AdminOfertas,
    AdminPracticas,
    AdminComentarios,
    AdminEmpresaModal,
    AdminEstudianteModal,
    AdminPracticaModal,
    AdminSeleccionadosModal
  ],
  providers: [PanelAdminStore, Inactividad],
  templateUrl: './panel-administrador.html',
  styleUrl: './panel-administrador.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'panel-admin' }
})
export class PanelAdministrador implements OnInit {
  protected readonly store = inject(PanelAdminStore);
  protected readonly inactividad = inject(Inactividad);
  private readonly router = inject(Router);

  menuAdminAbierto = false;
  mostrarModalPassword = false;

  protected readonly encabezado = computed(() => ENCABEZADOS[this.store.vista()]);

  ngOnInit(): void {
    if (!this.store.inicializarSesion()) {
      this.cerrarSesion();
      return;
    }
    this.store.cargarTodo();
    this.inactividad.iniciar(() => setTimeout(() => this.router.navigate(['/login']), 4000));
  }

  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:click')
  @HostListener('window:scroll')
  registrarActividad(): void {
    this.inactividad.reiniciar();
  }

  irA(vista: VistaAdmin): void {
    this.menuAdminAbierto = false;
    this.store.cambiarVista(vista);
  }

  onSeleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.store.subirFotoAdmin(input.files[0]);
    }
    this.menuAdminAbierto = false;
  }

  abrirModalPassword(): void {
    this.menuAdminAbierto = false;
    this.mostrarModalPassword = true;
  }

  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_sesion');
    this.router.navigate(['/login']);
  }
}
