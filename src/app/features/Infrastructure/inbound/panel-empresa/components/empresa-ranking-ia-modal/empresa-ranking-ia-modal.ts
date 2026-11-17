import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { PanelEmpresaStore } from '../../panel-empresa.store';

/** Modal con el ranking de candidatos generado por IA (estado en PanelEmpresaStore.rankingIa). */
@Component({
  selector: 'app-empresa-ranking-ia-modal',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './empresa-ranking-ia-modal.html'
})
export class EmpresaRankingIaModal {
  protected readonly store = inject(PanelEmpresaStore);
}
