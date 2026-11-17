import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormsModule } from '@angular/forms';
import { OfferAdminDTO } from '../../../../../../core/services/admin/admin';
import { PROGRAMAS_POR_SEDE } from '../../../../../../core/constants/catalogos-udec';
import { PanelAdminStore } from '../../panel-administrador.store';
import {
  coincideProgramaAcademico,
  normalizarTextoSinTildes,
  obtenerEstadoNormalizadoOferta,
  paginar,
  totalPaginas
} from '../../panel-administrador.utils';

/** Vista "Ofertas": ofertas actuales (se pueden cerrar) e historial de ofertas cerradas/completadas. */
@Component({
  selector: 'app-admin-ofertas',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './admin-ofertas.html'
})
export class AdminOfertas {
  protected readonly store = inject(PanelAdminStore);
  readonly modalidadesCatalogo = ['Presencial', 'Remoto', 'Híbrido'];
  readonly profesionesCatalogo = Array.from(
    new Set(Object.values(PROGRAMAS_POR_SEDE).reduce((acc, val) => acc.concat(val), [] as string[]))
  ).sort();
  private readonly porPagina = 5;

  readonly subVista = signal<'actuales' | 'historial'>('actuales');
  readonly filtroModalidad = signal('TODAS');
  readonly filtroProfesion = signal('TODAS');
  readonly pagina = signal(1);

  private readonly filtradasPorCombo = computed(() => {
    const modalidad = this.filtroModalidad();
    const profesion = this.filtroProfesion();
    return this.store.ofertas().filter(of => {
      const matchModalidad = modalidad === 'TODAS' ||
        normalizarTextoSinTildes(of.modality || '') === normalizarTextoSinTildes(modalidad);
      const matchProfesion = profesion === 'TODAS' || coincideProgramaAcademico(of.profession || '', profesion);
      return matchModalidad && matchProfesion;
    });
  });

  readonly actuales = computed(() => this.filtradasPorCombo().filter(of => {
    const estado = obtenerEstadoNormalizadoOferta(of);
    return of.availableSpots > 0 && estado !== 'CERRADA' && estado !== 'RECHAZADA';
  }));

  readonly historial = computed(() => this.filtradasPorCombo().filter(of => {
    const estado = obtenerEstadoNormalizadoOferta(of);
    return of.availableSpots === 0 || estado === 'CERRADA' || estado === 'RECHAZADA' || estado === 'FINALIZADA';
  }));

  readonly listaActiva = computed<OfferAdminDTO[]>(() => this.subVista() === 'actuales' ? this.actuales() : this.historial());
  readonly totalPaginas = computed(() => totalPaginas(this.listaActiva().length, this.porPagina));
  readonly paginadas = computed(() => paginar(this.listaActiva(), this.pagina(), this.porPagina));

  cambiarSubVista(subVista: 'actuales' | 'historial'): void {
    this.subVista.set(subVista);
    this.pagina.set(1);
  }

  filtrar(filtro: { set(v: string): void }, valor: string): void {
    filtro.set(valor);
    this.pagina.set(1);
  }
}
