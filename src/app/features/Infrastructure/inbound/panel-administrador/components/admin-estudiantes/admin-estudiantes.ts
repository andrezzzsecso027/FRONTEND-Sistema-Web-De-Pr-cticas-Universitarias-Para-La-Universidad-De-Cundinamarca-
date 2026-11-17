import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormsModule } from '@angular/forms';
import { PROGRAMAS_POR_SEDE, SEDES_CATALOGO } from '../../../../../../core/constants/catalogos-udec';
import { PanelAdminStore } from '../../panel-administrador.store';
import { coincideProgramaAcademico, normalizarTextoSinTildes, paginar, totalPaginas } from '../../panel-administrador.utils';

/** Vista "Estudiantes": listado con filtros por sede y programa académico (catálogo oficial UdeC). */
@Component({
  selector: 'app-admin-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './admin-estudiantes.html'
})
export class AdminEstudiantes {
  protected readonly store = inject(PanelAdminStore);
  readonly sedesCatalogo = SEDES_CATALOGO;
  private readonly porPagina = 6;

  readonly filtroTexto = signal('');
  readonly filtroSede = signal('TODAS');
  readonly filtroPrograma = signal('TODOS');
  readonly pagina = signal(1);

  readonly programasDisponibles = computed(() => {
    const sede = this.filtroSede();
    if (sede !== 'TODAS') return PROGRAMAS_POR_SEDE[sede] || [];
    const todos = Object.values(PROGRAMAS_POR_SEDE).reduce((acc, val) => acc.concat(val), [] as string[]);
    return Array.from(new Set(todos));
  });

  readonly filtrados = computed(() => {
    const q = this.filtroTexto().trim().toLowerCase();
    const sede = this.filtroSede();
    const programa = this.filtroPrograma();
    return this.store.estudiantes().filter(est => {
      const doc = String(est.document || est.documento || '').toLowerCase();
      const nom = `${est.name || est.nombres || ''} ${est.lastName || est.apellidos || ''}`.toLowerCase();
      const sedeEst = normalizarTextoSinTildes(est.headquarters || est.sede || '');
      const progEst = est.academicProgram || est.programaAcademico || '';

      const matchTexto = !q || doc.includes(q) || nom.includes(q);
      const matchSede = sede === 'TODAS' || sedeEst === normalizarTextoSinTildes(sede);
      const matchProg = programa === 'TODOS' || coincideProgramaAcademico(progEst, programa);
      return matchTexto && matchSede && matchProg;
    });
  });

  readonly totalPaginas = computed(() => totalPaginas(this.filtrados().length, this.porPagina));
  readonly paginados = computed(() => paginar(this.filtrados(), this.pagina(), this.porPagina));

  filtrarTexto(valor: string): void {
    this.filtroTexto.set(valor);
    this.pagina.set(1);
  }

  cambiarSede(valor: string): void {
    this.filtroSede.set(valor);
    this.filtroPrograma.set('TODOS');
    this.pagina.set(1);
  }

  cambiarPrograma(valor: string): void {
    this.filtroPrograma.set(valor);
    this.pagina.set(1);
  }
}
