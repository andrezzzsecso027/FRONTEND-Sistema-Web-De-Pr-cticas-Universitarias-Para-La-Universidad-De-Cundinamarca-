import { Component, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Empresa } from '../../../../../../core/services/empresa/empresa';
import { PanelEmpresaStore } from '../../panel-empresa.store';

/** Vista "Mi Empresa": logo, PDF del NIT y datos corporativos. */
@Component({
  selector: 'app-empresa-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Icon],
  templateUrl: './empresa-perfil.html'
})
export class EmpresaPerfil {
  protected readonly store = inject(PanelEmpresaStore);
  private readonly empresaService = inject(Empresa);

  readonly perfilForm = inject(FormBuilder).group({
    companyName: ['', Validators.required],
    businessName: [''],
    nit: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],
    companyType: ['Privada'],
    phone: [''],
    department: ['Cundinamarca'],
    city: ['Fusagasugá'],
    address: [''],
    legalRepName: [''],
    legalRepLastName: [''],
    companyDescription: [
      'Somos una organización aliada de la Universidad de Cundinamarca comprometida con la formación profesional y tecnológica de practicantes universitarios.',
      [Validators.required, Validators.minLength(20)]
    ]
  });

  constructor() {
    // Rellena el formulario cuando llegan (o se actualizan) los datos de la empresa desde la BD
    effect(() => {
      this.store.empresaBD();
      untracked(() => this.perfilForm.patchValue(this.store.valoresPerfil()));
    });
  }

  onSeleccionarLogo(event: Event): void {
    this.subirArchivo(event, 'empresas_logos', 'Error al subir el logo a Cloudinary.', (url) => {
      this.store.logoUrl.set(url);
      localStorage.setItem(`logo_${this.store.nitEmpresa()}`, url);
    });
  }

  onSeleccionarPdfNit(event: Event): void {
    this.subirArchivo(event, 'empresas_nit', 'Error al subir el PDF a Cloudinary.', (url) => {
      this.store.pdfNitUrl.set(url);
      localStorage.setItem(`pdf_${this.store.nitEmpresa()}`, url);
    });
  }

  private subirArchivo(event: Event, carpeta: string, mensajeError: string, alSubir: (url: string) => void): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.store.cargando.set(true);
    this.store.limpiarMensajes();
    this.empresaService.subirArchivoCloudinary(input.files[0], carpeta).subscribe({
      next: (res: { url: string }) => {
        this.store.cargando.set(false);
        if (this.store.nitEmpresa()) {
          alSubir(res.url);
        }
        this.guardarPerfil(true);
      },
      error: () => {
        this.store.cargando.set(false);
        this.store.mensajeError.set(mensajeError);
      }
    });
  }

  guardarPerfil(esAutoGuardadoArchivo = false): void {
    const nit = this.store.nitEmpresa();
    if (!nit) return;
    const val = this.perfilForm.getRawValue();

    const payload = {
      companyName: val.companyName,
      legalName: val.businessName,
      companyType: val.companyType,
      companyPhoneNumber: val.phone,
      department: val.department,
      city: val.city,
      companyAddress: val.address,
      companyDescription: val.companyDescription,
      logoUrl: this.store.logoUrl(),
      rutPdfUrl: this.store.pdfNitUrl(),
      legalRepresentative: {
        nameRepresentative: val.legalRepName,
        lastNameRepresentative: val.legalRepLastName,
        numberDocument: this.store.ccRepresentanteLegal()
      }
    };

    this.store.cargando.set(true);
    this.empresaService.actualizarPerfilEmpresa(nit, payload).subscribe({
      next: (actualizada: any) => {
        this.store.cargando.set(false);
        this.store.nombreEmpresa.set(actualizada?.companyName || this.store.nombreEmpresa());
        if (actualizada) {
          this.store.empresaBD.set(actualizada);
        }
        this.store.mensajeExito.set(esAutoGuardadoArchivo
          ? '¡Archivo subido a Cloudinary y vinculado a tu perfil en la Base de Datos!'
          : '¡Perfil corporativo y documentos guardados exitosamente en la Base de Datos!');
      },
      error: () => {
        this.store.cargando.set(false);
        this.store.mensajeError.set('No se pudo actualizar el perfil en la base de datos.');
      }
    });
  }
}
