import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Inactividad } from '../../../../core/services/sesion/inactividad';
import { CambiarPasswordModal } from '../../../../share/ui/cambiar-password-modal/cambiar-password-modal';
import { Icon } from '../../../../share/ui/icon/icon';
import { PanelEstudianteStore } from './panel-estudiante.store';

/**
 * Shell del portal del estudiante: barra lateral, alertas, modales (contraseña, recomendación IA)
 * y cierre por inactividad. Las vistas (ofertas, mis postulaciones, mi perfil) son rutas hijas
 * que comparten el estado de PanelEstudianteStore.
 */
@Component({
  selector: 'app-panel-estudiante',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Icon, CambiarPasswordModal],
  providers: [PanelEstudianteStore, Inactividad],
  templateUrl: './panel-estudiante.html'
})
export class PanelEstudiante implements OnInit {
  protected readonly store = inject(PanelEstudianteStore);
  protected readonly inactividad = inject(Inactividad);
  private readonly router = inject(Router);

  menuAbierto = false;
  mostrarModalPassword = false;

  constructor() {
    // Los avisos pertenecen a la vista donde ocurrieron: se limpian al cambiar de sección
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => { this.store.limpiarMensajes(); this.menuAbierto = false; });
  }

  ngOnInit(): void {
    this.store.inicializar();
    this.inactividad.iniciar(
      () => setTimeout(() => this.router.navigate(['/login']), 4000),
      ['documento_estudiante']
    );
  }

  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:click')
  @HostListener('window:scroll')
  registrarActividad(): void {
    this.inactividad.reiniciar();
  }

  abrirModalPassword(): void {
    this.menuAbierto = false;
    this.mostrarModalPassword = true;
  }

  cerrarSesion(): void {
    ['token', 'usuario_sesion', 'documento_estudiante'].forEach(k => localStorage.removeItem(k));
    this.router.navigate(['/login']);
  }
}
