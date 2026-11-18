import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../share/ui/icon/icon';
import { PanelEstudianteStore } from '../panel-estudiante/panel-estudiante.store';
import { EvaluarEmpresaModal } from './evaluar-empresa-modal';
import { calcularProgreso, construirSeguimiento } from './mi-practica.util';

/**
 * Portal del estudiante — vista "Mi práctica": seguimiento de la práctica (línea de tiempo,
 * avance por fechas, contrato, retroalimentación de la empresa) y evaluación de la empresa
 * cuando la práctica está FINALIZADA. Lee GET /api/estudiantes/me/practicas.
 */
@Component({
  selector: 'app-mi-practica',
  standalone: true,
  imports: [DatePipe, RouterLink, Icon, EvaluarEmpresaModal],
  templateUrl: './mi-practica.html',
  styleUrl: './mi-practica.scss',
  host: { class: 'ui-view' }
})
export class MiPracticaVista {
  protected readonly store = inject(PanelEstudianteStore);
  protected readonly estrellas = [1, 2, 3, 4, 5];

  /** Práctica elegida en las pestañas (por defecto la primera: la en curso o la más reciente). */
  private readonly idSeleccionada = signal<number | null>(null);
  protected readonly mostrarEvaluacion = signal(false);

  protected readonly practica = computed(() => {
    const lista = this.store.practicas();
    return lista.find(p => p.idPractice === this.idSeleccionada()) ?? lista[0] ?? null;
  });
  protected readonly progreso = computed(() => {
    const p = this.practica();
    return p ? calcularProgreso(p) : null;
  });
  protected readonly pasos = computed(() => {
    const p = this.practica();
    return p ? construirSeguimiento(p) : [];
  });

  protected seleccionar(idPractice: number): void {
    this.idSeleccionada.set(idPractice);
  }
}
