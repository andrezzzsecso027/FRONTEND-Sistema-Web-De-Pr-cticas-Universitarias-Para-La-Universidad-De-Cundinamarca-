import { Component, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Empresa } from '../../../../core/services/empresa/empresa';
import { Icon } from '../../../../share/ui/icon/icon';
import { PanelEstudianteStore } from '../panel-estudiante/panel-estudiante.store';

const TAMANO_MAXIMO = 10 * 1024 * 1024;

/**
 * Portal del estudiante — vista "Mi perfil": datos académicos (solo lectura), foto,
 * hoja de vida en PDF y perfil profesional que usan las empresas y la IA.
 */
@Component({
  selector: 'app-perfil-estudiante',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Icon],
  templateUrl: './perfil-estudiante.html',
  host: { class: 'ui-view' }
})
export class PerfilEstudiante {
  protected readonly store = inject(PanelEstudianteStore);
  private readonly archivos = inject(Empresa);

  readonly nivelesIngles = ['A1 - Principiante', 'A2 - Básico', 'B1 - Intermedio', 'B2 - Intermedio alto', 'C1 - Avanzado', 'C2 - Dominio'];

  readonly form = inject(FormBuilder).nonNullable.group({
    aboutMe: [''],
    skills: [''],
    englishLevel: ['B1 - Intermedio'],
    githubUrl: ['']
  });

  subiendoFoto = false;
  subiendoCv = false;

  constructor() {
    // Rellena el formulario cuando llega el perfil desde la BD
    effect(() => {
      const perfil = this.store.perfil();
      if (!perfil) return;
      untracked(() => this.form.patchValue({
        aboutMe: perfil.aboutMe ?? '',
        skills: perfil.skills ?? '',
        englishLevel: perfil.englishLevel || 'B1 - Intermedio',
        githubUrl: perfil.githubUrl ?? ''
      }));
    });
  }

  guardar(): void {
    this.store.guardarPerfil(this.form.getRawValue(), 'Perfil profesional guardado.');
  }

  onSeleccionarFoto(event: Event): void {
    this.subir(event, 'estudiantes_fotos', ['image/png', 'image/jpeg', 'image/webp'], 'La foto debe ser PNG, JPG o WEBP.',
      (url) => this.store.guardarPerfil({ ...this.form.getRawValue(), photoUrl: url }, 'Foto de perfil actualizada.'),
      (v) => this.subiendoFoto = v);
  }

  onSeleccionarCv(event: Event): void {
    this.subir(event, 'estudiantes_cv', ['application/pdf'], 'La hoja de vida debe ser un archivo PDF.',
      (url) => this.store.guardarPerfil({ ...this.form.getRawValue(), linkLifesheet: url }, 'Hoja de vida actualizada.'),
      (v) => this.subiendoCv = v);
  }

  /** Valida tipo y tamaño (mismas reglas que el backend) antes de subir el archivo. */
  private subir(event: Event, carpeta: string, tipos: string[], errorTipo: string,
                alSubir: (url: string) => void, setCargando: (v: boolean) => void): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.store.limpiarMensajes();
    if (!tipos.includes(file.type)) {
      this.store.mensajeError.set(errorTipo);
      return;
    }
    if (file.size > TAMANO_MAXIMO) {
      this.store.mensajeError.set('El archivo supera el tamaño máximo de 10 MB.');
      return;
    }

    setCargando(true);
    this.archivos.subirArchivoCloudinary(file, carpeta).subscribe({
      next: (res) => { setCargando(false); alSubir(res.url); },
      error: (err) => {
        setCargando(false);
        this.store.mensajeError.set(err?.error?.error || 'No fue posible subir el archivo. Intenta de nuevo.');
      }
    });
  }
}
