import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormsModule } from '@angular/forms';
import { TIPOS_EMPRESA_CATALOGO } from '../../../../../../core/constants/catalogos-udec';
import { PanelAdminStore } from '../../panel-administrador.store';
import { normalizarCodigoTipoEmpresa, paginar, totalPaginas } from '../../panel-administrador.utils';

/** Vista "Empresas Aprobadas": directorio con filtros por texto, tipo de sociedad y ciudad. */
@Component({
  selector: 'app-admin-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './admin-empresas.html'
})
export class AdminEmpresas {
  protected readonly store = inject(PanelAdminStore);
  readonly tiposEmpresaCatalogo = TIPOS_EMPRESA_CATALOGO;
  private readonly porPagina = 5;

  readonly filtroTexto = signal('');
  readonly filtroTipo = signal('TODOS');
  readonly filtroCiudad = signal('TODAS');
  readonly pagina = signal(1);

  readonly ciudadesDisponibles = computed(() => {
    const ciudades = this.store.empresasAprobadas().map(e => (e.city || '').trim()).filter(Boolean);
    return Array.from(new Set(ciudades));
  });

  readonly filtradas = computed(() => {
    const q = this.filtroTexto().trim().toLowerCase();
    const tipo = this.filtroTipo();
    const ciudad = this.filtroCiudad();
    return this.store.empresasAprobadas().filter(e => {
      const matchTexto = !q ||
        e.companyName?.toLowerCase().includes(q) ||
        e.nit?.toLowerCase().includes(q) ||
        e.legalName?.toLowerCase().includes(q);
      const matchTipo = tipo === 'TODOS' || normalizarCodigoTipoEmpresa(e.companyType) === tipo;
      const matchCiudad = ciudad === 'TODAS' || (e.city || '').toLowerCase() === ciudad.toLowerCase();
      return matchTexto && matchTipo && matchCiudad;
    });
  });

  readonly totalPaginas = computed(() => totalPaginas(this.filtradas().length, this.porPagina));
  readonly paginadas = computed(() => paginar(this.filtradas(), this.pagina(), this.porPagina));

  /** Cambia un filtro y vuelve a la primera página. */
  filtrar(filtro: { set(v: string): void }, valor: string): void {
    filtro.set(valor);
    this.pagina.set(1);
  }
}
