import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { Auth } from '../../../../core/services/auth';
import { Empresa } from '../../../../core/services/empresa/empresa';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-perfil-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer],
  templateUrl: './perfil-estudiante.html',
  styleUrl: './perfil-estudiante.scss'
})
export class PerfilEstudiante implements OnInit {
  cargando = false;
  subiendoFoto = false;
  subiendoCv = false;
  mensajeExito = '';
  mensajeError = '';

  documento = '';
  nombres = '';
  apellidos = '';
  correo = '';
  telefono = '';
  direccion = '';
  sede = 'Fusagasugá';
  programaAcademico = 'Ingeniería de Sistemas';

  photoUrl = '';
  linkLifesheet = '';
  skills = '';
  englishLevel = 'B1 - Intermedio';
  githubUrl = '';
  aboutMe = '';

  mostrarModalPassword = false;
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  cargandoPassword = false;
  mensajePasswordExito = '';
  mensajePasswordError = '';

  readonly nivelesIngles = [
    'A1 - Principiante',
    'A2 - Básico',
    'B1 - Intermedio',
    'B2 - Intermedio Alto',
    'C1 - Avanzado',
    'C2 - Dominio'
  ];

  constructor(
    private authService: Auth,
    private empresaService: Empresa,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosEstudiante();
  }

  get nombreCompleto(): string {
    return `${this.nombres} ${this.apellidos}`.trim() || 'Estudiante UdeC';
  }

  cargarDatosEstudiante(): void {
    const usuario = this.authService.getUsuarioActual() as any;
    if (!usuario) return;

    const idUserSesion = usuario.idUser || usuario.idUsuario || usuario.id;
    this.correo = usuario.email || usuario.correo || usuario.correoElectronico || '';

    this.http.get<any[]>(`${environment.baseUrl}/registro/estudiantes`).subscribe({
      next: (lista) => {
        const est = (lista || []).find(
          e => Number(e.idUser || e.idUsuario) === Number(idUserSesion)
        );
        if (est) {
          this.documento = String(est.document || est.documento || '');
          this.nombres = est.name || est.nombres || '';
          this.apellidos = est.lastName || est.apellidos || '';
          this.telefono = est.phoneNumber || est.telefono || '';
          this.direccion = est.addres || est.direccion || '';
          this.sede = est.headquarters || est.sede || 'Fusagasugá';
          this.programaAcademico = est.academicProgram || est.programaAcademico || '';

          if (this.documento) {
            localStorage.setItem('documento_estudiante', this.documento);
            this.cargarPerfilExtendidoBD(this.documento);
          }
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  cargarPerfilExtendidoBD(cedula: string): void {
    // 1. Primero cargamos respaldo local inmediato si existe
    const cache = localStorage.getItem(`perfil_est_${cedula}`);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        this.skills = parsed.skills || this.skills;
        this.englishLevel = parsed.englishLevel || this.englishLevel;
        this.githubUrl = parsed.githubUrl || this.githubUrl;
        this.linkLifesheet = parsed.linkLifesheet || this.linkLifesheet;
        this.photoUrl = parsed.photoUrl || this.photoUrl;
        this.aboutMe = parsed.aboutMe || this.aboutMe;
      } catch {}
    }

    // 2. Luego sincronizamos desde PostgreSQL
    this.http.get<any>(`${environment.baseUrl}/registro/estudiantes/perfil/${cedula}`).subscribe({
      next: (perfil) => {
        if (perfil) {
          this.skills = perfil.skills || this.skills;
          this.englishLevel = perfil.englishLevel || this.englishLevel;
          this.githubUrl = perfil.githubUrl || this.githubUrl;
          this.linkLifesheet = perfil.linkLifesheet || this.linkLifesheet;
          this.photoUrl = perfil.photoUrl || this.photoUrl;
          this.aboutMe = perfil.aboutMe || this.aboutMe;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  onSeleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    this.subiendoFoto = true;
    this.limpiarMensajes();
    this.cdr.detectChanges();

    this.empresaService.subirArchivoCloudinary(file, 'estudiantes_fotos').subscribe({
      next: (res: { url: string }) => {
        this.subiendoFoto = false;
        this.photoUrl = res.url;
        this.guardarPerfil(true);
        this.cdr.detectChanges();
      },
      error: () => {
        this.subiendoFoto = false;
        this.mensajeError = 'Error al subir la foto a Cloudinary.';
        this.cdr.detectChanges();
      }
    });
  }

  onSeleccionarPdfCv(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    this.subiendoCv = true;
    this.limpiarMensajes();
    this.cdr.detectChanges();

    this.empresaService.subirArchivoCloudinary(file, 'estudiantes_cv').subscribe({
      next: (res: { url: string }) => {
        this.subiendoCv = false;
        this.linkLifesheet = res.url;
        this.guardarPerfil(true);
        this.cdr.detectChanges();
      },
      error: () => {
        this.subiendoCv = false;
        this.mensajeError = 'Error al subir el PDF de la Hoja de Vida a Cloudinary.';
        this.cdr.detectChanges();
      }
    });
  }

  guardarPerfil(esAutoArchivo = false): void {
    if (!this.documento) {
      this.mensajeError = 'No se detectó tu documento de identidad.';
      return;
    }

    this.cargando = true;
    this.limpiarMensajes();

    const payload = {
      documentStudent: this.documento,
      aboutMe: this.aboutMe,
      skills: this.skills,
      englishLevel: this.englishLevel,
      githubUrl: this.githubUrl,
      linkLifesheet: this.linkLifesheet,
      photoUrl: this.photoUrl
    };

    localStorage.setItem(`perfil_est_${this.documento}`, JSON.stringify(payload));

    this.http.post<any>(`${environment.baseUrl}/registro/estudiantes/perfil`, payload).subscribe({
      next: () => {
        this.cargando = false;
        this.mensajeExito = esAutoArchivo
          ? '¡Archivo subido a Cloudinary y vinculado a tu perfil en la Base de Datos!'
          : '¡Perfil profesional, nivel de inglés y GitHub guardados exitosamente en la Base de Datos!';
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'No se pudo guardar en la base de datos. Asegúrate de reiniciar el Backend.';
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalPassword(): void {
    this.mostrarModalPassword = true;
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.mensajePasswordExito = '';
    this.mensajePasswordError = '';
  }

  cerrarModalPassword(): void {
    this.mostrarModalPassword = false;
  }

  guardarNuevaContrasena(): void {
    this.mensajePasswordExito = '';
    this.mensajePasswordError = '';

    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      this.mensajePasswordError = 'Todos los campos son obligatorios.';
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.mensajePasswordError = 'Las contraseñas nuevas no coinciden.';
      return;
    }
    if (this.passwordNueva.length < 6) {
      this.mensajePasswordError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.cargandoPassword = true;
    this.http.patch(
      `${environment.baseUrl}/auth/cambiar-contrasena`,
      {
        email: this.correo,
        currentPassword: this.passwordActual,
        newPassword: this.passwordNueva
      },
      { responseType: 'text' }
    ).subscribe({
      next: (res) => {
        this.cargandoPassword = false;
        this.mensajePasswordExito = res || 'Contraseña actualizada exitosamente.';
        this.passwordActual = '';
        this.passwordNueva = '';
        this.passwordConfirmar = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoPassword = false;
        this.mensajePasswordError = typeof err.error === 'string' && err.error
          ? err.error
          : 'La contraseña actual es incorrecta.';
        this.cdr.detectChanges();
      }
    });
  }

  limpiarMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
  }
}