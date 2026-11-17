import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Empresa } from '../../../../../../core/services/empresa/empresa';
import { environment } from '../../../../../../../environments/environment';
import { PanelEmpresaStore, PracticaEmpresaView } from '../../panel-empresa.store';

/** Vista "Mis Prácticas": practicantes aceptados, contrato PDF y seguimiento. */
@Component({
  selector: 'app-empresa-mis-practicas',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './empresa-mis-practicas.html'
})
export class EmpresaMisPracticas {
  protected readonly store = inject(PanelEmpresaStore);
  private readonly empresaService = inject(Empresa);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  subiendoContratoId: number | null = null;
  guardandoSeguimientoId: number | null = null;

  actualizar(): void {
    this.store.cargarMisOfertasYPracticas();
    this.store.cargarContratosEmpresa();
  }

  onSeleccionarContratoPdf(event: Event, item: PracticaEmpresaView): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const archivo = input.files[0];
    const idPostulation = Number(item.idPostulation);
    this.subiendoContratoId = idPostulation;
    this.store.mensajeError.set('');

    this.empresaService.subirArchivoCloudinary(archivo, 'contratos_practicas').subscribe({
      next: (res: { url: string }) => {
        this.subiendoContratoId = null;
        const payload = this.construirPayload(item, {
          fileName: archivo.name,
          fileUrl: res.url,
          companyComments: this.store.comentariosContrato[idPostulation] || 'Contrato de práctica cargado por la empresa.',
          trackingStatus: this.store.estadoSeguimientoContrato[idPostulation] || 'CONTRATO_FIRMADO'
        });

        this.http.post<any>(`${environment.baseUrl}/documentos/seguimiento`, payload).subscribe({
          next: (docGuardado) => {
            this.store.estadoSeguimientoContrato[idPostulation] = docGuardado.trackingStatus || 'CONTRATO_FIRMADO';
            this.store.registrarContrato(idPostulation, docGuardado);
            this.store.mensajeExito.set(`Documento de práctica (${archivo.name}) subido y guardado exitosamente.`);
            this.cdr.detectChanges();
          },
          error: () => {
            this.store.mensajeError.set('El PDF subió a la nube, pero hubo un error al registrarlo en la base de datos.');
            this.cdr.detectChanges();
          }
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.subiendoContratoId = null;
        this.store.mensajeError.set('Error al subir el PDF del contrato a Cloudinary.');
        this.cdr.detectChanges();
      }
    });
  }

  guardarSeguimiento(item: PracticaEmpresaView): void {
    const idPostulation = Number(item.idPostulation);
    const docActual = this.store.contratosPorPostulacion()[idPostulation];
    this.guardandoSeguimientoId = idPostulation;

    const payload = this.construirPayload(item, {
      fileName: docActual?.fileName || null,
      fileUrl: docActual?.fileUrl || null,
      companyComments: this.store.comentariosContrato[idPostulation] || '',
      trackingStatus: this.store.estadoSeguimientoContrato[idPostulation] || 'EN_CURSO'
    }, docActual?.offerName);

    this.http.post<any>(`${environment.baseUrl}/documentos/seguimiento`, payload).subscribe({
      next: (docGuardado) => {
        this.guardandoSeguimientoId = null;
        this.store.registrarContrato(idPostulation, docGuardado);
        this.store.mensajeExito.set('Seguimiento y observaciones de la práctica actualizados correctamente.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardandoSeguimientoId = null;
        this.store.mensajeError.set('No fue posible actualizar el seguimiento de la práctica.');
        this.cdr.detectChanges();
      }
    });
  }

  private construirPayload(item: PracticaEmpresaView, datos: Record<string, any>, offerNameRespaldo?: string) {
    return {
      idPostulation: Number(item.idPostulation),
      nitCompany: this.store.nitEmpresa(),
      documentStudent: String(item.studentDocument || ''),
      studentFullName: item.studentFullName || 'Estudiante UdeC',
      offerName: item.offerName || offerNameRespaldo || 'Práctica Profesional',
      ...datos
    };
  }
}
