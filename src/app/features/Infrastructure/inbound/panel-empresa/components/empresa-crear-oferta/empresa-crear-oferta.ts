import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OfertaService, OfferRequestDTO } from '../../../../../../core/services/oferta/ofertas';
import { PanelEmpresaStore } from '../../panel-empresa.store';

/** Vista "Nueva Oferta": formulario de publicación de una oferta de práctica. */
@Component({
  selector: 'app-empresa-crear-oferta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Icon],
  templateUrl: './empresa-crear-oferta.html'
})
export class EmpresaCrearOferta {
  protected readonly store = inject(PanelEmpresaStore);
  private readonly ofertaService = inject(OfertaService);

  readonly programasUdec: string[] = [
    'Administración de Empresas',
    'Contaduría Pública',
    'Enfermería',
    'Ingeniería Agronómica',
    'Ingeniería Ambiental',
    'Ingeniería de Sistemas',
    'Ingeniería de Sistemas y Computación',
    'Ingeniería de Software',
    'Ingeniería Electrónica',
    'Ingeniería Industrial',
    'Ingeniería Mecatrónica',
    'Ingeniería Topográfica y Geomática',
    'Licenciatura en Ciencias Sociales',
    'Licenciatura en Educación Física',
    'Medicina Veterinaria y Zootecnia',
    'Música',
    'Profesional en Ciencias del Deporte',
    'Zootecnia'
  ];

  readonly modalidades: string[] = ['Presencial', 'Remoto', 'Híbrido'];

  readonly ofertaForm = inject(FormBuilder).group({
    practiceName: ['', [Validators.required, Validators.minLength(5)]],
    profession: ['', [Validators.required]],
    modality: ['Presencial', [Validators.required]],
    salary: [0, [Validators.required, Validators.min(0)]],
    location: ['Fusagasugá, Cundinamarca', [Validators.required]],
    availableSpots: [1, [Validators.required, Validators.min(1)]],
    closingDate: ['', [Validators.required]],
    practiceDescription: ['', [Validators.required, Validators.minLength(15)]]
  });

  publicarOferta(): void {
    if (this.ofertaForm.invalid) {
      this.ofertaForm.markAllAsTouched();
      this.store.mensajeError.set('Por favor completa todos los campos obligatorios de la oferta.');
      return;
    }
    const nit = this.store.nitEmpresa();
    if (!nit) {
      this.store.mensajeError.set('No se detectó el NIT de tu empresa en la sesión.');
      return;
    }

    this.store.cargando.set(true);
    this.store.limpiarMensajes();

    const payload = { ...this.ofertaForm.getRawValue(), nitCompanyAssociated: nit } as OfferRequestDTO;

    this.ofertaService.crearOferta(payload).subscribe({
      next: () => {
        this.store.cargando.set(false);
        this.store.mensajeExito.set('¡Oferta de práctica publicada exitosamente!');
        this.ofertaForm.reset({
          practiceName: '',
          profession: '',
          modality: 'Presencial',
          salary: 0,
          location: 'Fusagasugá, Cundinamarca',
          availableSpots: 1,
          closingDate: '',
          practiceDescription: ''
        });
        this.store.cargarMisOfertasYPracticas();
        setTimeout(() => this.store.cambiarVista('mis-ofertas'), 1200);
      },
      error: (err: any) => {
        this.store.cargando.set(false);
        this.store.mensajeError.set(typeof err?.error === 'string' && err.error ? err.error : 'No se pudo publicar la oferta.');
      }
    });
  }
}
