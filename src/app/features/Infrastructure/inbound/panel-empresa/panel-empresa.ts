import { Component, HostListener, OnInit, ViewEncapsulation, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Inactividad } from '../../../../core/services/sesion/inactividad';
import { CambiarPasswordModal } from '../../../../share/ui/cambiar-password-modal/cambiar-password-modal';
import { Icon } from '../../../../share/ui/icon/icon';
import { PanelEmpresaStore, VistaEmpresa } from './panel-empresa.store';
import { EmpresaInicio } from './components/empresa-inicio/empresa-inicio';
import { EmpresaCrearOferta } from './components/empresa-crear-oferta/empresa-crear-oferta';
import { EmpresaMisOfertas } from './components/empresa-mis-ofertas/empresa-mis-ofertas';
import { EmpresaPostulantes } from './components/empresa-postulantes/empresa-postulantes';
import { EmpresaMisPracticas } from './components/empresa-mis-practicas/empresa-mis-practicas';
import { EmpresaPerfil } from './components/empresa-perfil/empresa-perfil';
import { EmpresaRankingIaModal } from './components/empresa-ranking-ia-modal/empresa-ranking-ia-modal';

export type { PracticaEmpresaView } from './panel-empresa.store';

const ENCABEZADOS: Record<Exclude<VistaEmpresa, 'inicio' | 'postulantes'>, { titulo: string; descripcion: string }> = {
  'crear-oferta': {
    titulo: 'Nueva oferta de práctica',
    descripcion: 'Publica una convocatoria para estudiantes de la Universidad de Cundinamarca.'
  },
  'mis-ofertas': {
    titulo: 'Mis ofertas',
    descripcion: 'Convocatorias publicadas por tu empresa, sus cupos y los estudiantes postulados.'
  },
  'mis-practicas': {
    titulo: 'Practicantes',
    descripcion: 'Estudiantes vinculados: contrato de práctica, seguimiento y observaciones.'
  },
  perfil: {
    titulo: 'Mi empresa',
    descripcion: 'Información visible para los estudiantes y soporte legal verificado por la Universidad.'
  }
};

/**
 * Shell del panel de empresa: barra lateral de navegación, encabezado de la sección, alertas,
 * cierre por inactividad, selector de vistas y modales. Cada vista es un componente en ./components
 * y el estado compartido vive en PanelEmpresaStore. Estilos: sistema de diseño global (`ui-*`).
 */
@Component({
  selector: 'app-panel-empresa',
  standalone: true,
  imports: [
    CommonModule,
    Icon,
    CambiarPasswordModal,
    EmpresaInicio,
    EmpresaCrearOferta,
    EmpresaMisOfertas,
    EmpresaPostulantes,
    EmpresaMisPracticas,
    EmpresaPerfil,
    EmpresaRankingIaModal
  ],
  providers: [PanelEmpresaStore, Inactividad],
  templateUrl: './panel-empresa.html',
  styleUrl: './panel-empresa.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'panel-empresa' }
})
export class PanelEmpresa implements OnInit {
  protected readonly store = inject(PanelEmpresaStore);
  protected readonly inactividad = inject(Inactividad);
  private readonly router = inject(Router);

  menuPerfilAbierto = false;
  mostrarModalPassword = false;

  /** null en Inicio y Postulantes: esas vistas tienen su propio encabezado. */
  protected readonly encabezado = computed(() => {
    const vista = this.store.vista();
    return vista === 'inicio' || vista === 'postulantes' ? null : ENCABEZADOS[vista];
  });

  ngOnInit(): void {
    this.store.inicializar();
    this.inactividad.iniciar(
      () => setTimeout(() => this.router.navigate(['/login']), 4000),
      ['nitEmpresa', 'nombreEmpresaReal']
    );
  }

  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:click')
  @HostListener('window:scroll')
  registrarActividad(): void {
    this.inactividad.reiniciar();
  }

  irA(vista: VistaEmpresa): void {
    this.menuPerfilAbierto = false;
    this.store.cambiarVista(vista);
  }

  abrirModalPassword(): void {
    this.menuPerfilAbierto = false;
    this.mostrarModalPassword = true;
  }

  cerrarSesion(): void {
    ['token', 'usuario_sesion', 'nitEmpresa', 'nombreEmpresaReal'].forEach(k => localStorage.removeItem(k));
    this.router.navigate(['/login']);
  }
}
