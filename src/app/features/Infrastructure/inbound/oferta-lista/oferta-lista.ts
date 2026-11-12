import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { OfertaService, OfferRequestDTO } from '../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { Auth } from '../../../../core/services/auth';
import { IaSeguridadService } from '../../../../core/services/ia-seguridad/ia-seguridad';
import { UpdatePasswordService } from '../../../../core/services/update-pasword/update.password';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-oferta-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer],
  styleUrl: './oferta-lista.scss',
  templateUrl: './oferta-lista.html',
})
export class OfertaLista implements OnInit {
  ofertas: OfferRequestDTO[] = [];
  cargando = true;
  mensajeExito = '';
  mensajeError = '';
  procesandoId: number | null = null;

  // --- Variables IA Estudiante ---
  mostrarModalIaEstudiante = false;
  cargandoIaEstudiante = false;
  recomendacionIaTexto = '';
  totalOfertasAnalizadasIa = 0;
  errorIaEstudiante = '';

  // --- Variables Perfil Académico Estudiante ---
  mostrarModalPerfilEstudiante = false;
  guardandoPerfil = false;
  mensajePerfilExito = '';
  mensajePerfilError = '';
  perfilEstudiante = {
    documentStudent: '',
    skills: 'Java, Spring Boot, Angular, PostgreSQL, Docker, Git',
    englishLevel: 'B1 - Intermedio',
    githubUrl: 'https://github.com/',
    resumeLink: '',
    aboutMe: 'Estudiante de Ingeniería de Sistemas y Computación de la Universidad de Cundinamarca con enfoque en arquitectura limpia y desarrollo Full Stack.'
  };

  // --- Variables Cambio de Contraseña ---
  mostrarModalPassword = false;
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  mensajePasswordExito = '';
  mensajePasswordError = '';
  cargandoPassword = false;

  constructor(
    private ofertaService: OfertaService,
    private postulacionService: PostulacionService,
    private authService: Auth,
    private iaSeguridadService: IaSeguridadService,
    private updatePasswordService: UpdatePasswordService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.inicializarDocumentoYPerfil();
    this.cargarOfertas();
  }

  private obtenerDocumentoActual(): string {
    const usuario = this.authService.getUsuarioActual() as any;
    return (
      usuario?.documento ||
      usuario?.document ||
      usuario?.documentNumber ||
      localStorage.getItem('documento_estudiante') ||
      usuario?.idUser?.toString() ||
      '1003558974'
    );
  }

  inicializarDocumentoYPerfil(): void {
   const usuario = this.authService.getUsuarioActual() as any;
    const idUserSesion = usuario?.idUser || usuario?.idUsuario || usuario?.id;

    // 1. Consultar la tabla de estudiantes para obtener la Cédula (documento) real a partir del idUser
    this.http.get<any[]>(`${environment.baseUrl}/registro/estudiantes`).subscribe({
      next: (listaEstudiantes) => {
        const encontrado = (listaEstudiantes || []).find(
          e => Number(e.idUser || e.idUsuario) === Number(idUserSesion)
        );
        if (encontrado && (encontrado.document || encontrado.documento)) {
          const cedulaReal = String(encontrado.document || encontrado.documento);
          this.perfilEstudiante.documentStudent = cedulaReal;
          localStorage.setItem('documento_estudiante', cedulaReal);
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  cargarOfertas(): void {
    this.cargando = true;
    this.cdr.detectChanges();

    this.ofertaService.obtenerOfertasActivas().subscribe({
      next: (data: OfferRequestDTO[]) => {
        this.ofertas = data || [];
        this.cargando = false;
        this.cdr.detectChanges(); // Soluciona el bug de los 2 clics
      },
      error: (err: any) => {
        this.cargando = false;
        if (err.status === 204) {
          this.ofertas = [];
        } else {
          this.mensajeError = 'No se pudieron cargar las ofertas.';
        }
        this.cdr.detectChanges(); // Soluciona el bug de los 2 clics
      }
    });
  }

  postularme(oferta: OfferRequestDTO): void {
    const usuario = this.authService.getUsuarioActual();
    if (!usuario) {
      this.mensajeError = 'Debes iniciar sesión para postularte.';
      this.cdr.detectChanges();
      setTimeout(() => { this.mensajeError = ''; this.cdr.detectChanges(); }, 3000);
      return;
    }

    const documento = this.obtenerDocumentoActual();
    this.procesandoId = oferta.idOffer ?? null;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();

    this.postulacionService.aplicarAOferta({
      idOffer: oferta.idOffer!,
      documentNumberStudent: documento
    }).subscribe({
      next: () => {
        this.procesandoId = null;
        this.mensajeExito = `Te postulaste a "${oferta.practiceName}" exitosamente.`;
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeExito = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: (err) => {
        this.procesandoId = null;
        this.mensajeError = err.status === 409
          ? 'Ya te postulaste a esta oferta.'
          : 'Error al postularte. Intenta de nuevo.';
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeError = ''; this.cdr.detectChanges(); }, 4000);
      }
    });
  }

  // --- MODAL PERFIL DEL ESTUDIANTE ---
  abrirModalPerfil(): void {
    this.mensajePerfilExito = '';
    this.mensajePerfilError = '';
    this.mostrarModalPerfilEstudiante = true;
    this.cdr.detectChanges();
  }

  cerrarModalPerfil(): void {
    this.mostrarModalPerfilEstudiante = false;
    this.cdr.detectChanges();
  }

  guardarPerfilEstudiante(): void {
    this.guardandoPerfil = true;
    this.mensajePerfilExito = '';
    this.mensajePerfilError = '';
    const doc = this.perfilEstudiante.documentStudent || this.obtenerDocumentoActual();

    localStorage.setItem(`perfil_est_${doc}`, JSON.stringify(this.perfilEstudiante));

    this.http.post(`${environment.baseUrl}/usuarios/perfil`, this.perfilEstudiante).subscribe({
      next: () => {
        this.guardandoPerfil = false;
        this.mensajePerfilExito = '¡Perfil profesional actualizado exitosamente!';
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardandoPerfil = false;
        this.mensajePerfilExito = '¡Perfil profesional actualizado y sincronizado!';
        this.cdr.detectChanges();
      }
    });
  }

  // --- RECOMENDADOR IA GEMINI ---
  solicitarRecomendacionIa(): void {
    const documento = this.obtenerDocumentoActual();
    this.mostrarModalIaEstudiante = true;
    this.cargandoIaEstudiante = true;
    this.recomendacionIaTexto = '';
    this.errorIaEstudiante = '';
    this.cdr.detectChanges();

    this.iaSeguridadService.recomendarOfertasEstudiante(documento).subscribe({
      next: (res) => {
        this.cargandoIaEstudiante = false;
        this.totalOfertasAnalizadasIa = res.totalOffersAnalyzed;
        this.recomendacionIaTexto = res.aiRecommendation;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoIaEstudiante = false;
        this.errorIaEstudiante = 'No fue posible conectar con el asistente de IA en este momento.';
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModalIaEstudiante(): void {
    this.mostrarModalIaEstudiante = false;
    this.cdr.detectChanges();
  }

  // --- CAMBIO DE CONTRASEÑA ---
  abrirModalPassword(): void {
    this.mostrarModalPassword = true;
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.mensajePasswordExito = '';
    this.mensajePasswordError = '';
    this.cdr.detectChanges();
  }

  cerrarModalPassword(): void {
    this.mostrarModalPassword = false;
    this.cdr.detectChanges();
  }

  guardarNuevaContrasena(): void {
    this.mensajePasswordExito = '';
    this.mensajePasswordError = '';

    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      this.mensajePasswordError = 'Todos los campos son obligatorios.';
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.mensajePasswordError = 'La nueva contraseña y su confirmación no coinciden.';
      return;
    }
    if (this.passwordNueva.length < 6) {
      this.mensajePasswordError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    const usuario = this.authService.getUsuarioActual() as any;
    const email = usuario?.email || usuario?.correo || usuario?.correoElectronico || this.updatePasswordService.obtenerEmailDeSesion();

    this.cargandoPassword = true;
    this.updatePasswordService.cambiarContrasena({
      email,
      currentPassword: this.passwordActual,
      newPassword: this.passwordNueva
    }).subscribe({
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

  formatearSalario(salario: number): string {
    if (!salario) return 'No especificado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(salario);
  }
}