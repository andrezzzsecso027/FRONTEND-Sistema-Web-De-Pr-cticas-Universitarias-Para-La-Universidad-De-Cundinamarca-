import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { correoInstitucional, normalizarCorreo } from '../../../../core/validators/correo-institucional';
import { HttpClient } from '@angular/common/http';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { Estudiante } from '../../../../core/services/estudiante/estudiante';
import { environment } from '../../../../../environments/environment';

@Component({
  imports: [RouterLink, Navbar, Footer, CommonModule, ReactiveFormsModule],
  standalone: true,
  selector: 'app-registro-estudiante',
  styleUrl: './registro-estudiante.scss',
  templateUrl: './registro-estudiante.html',
})
export class RegistroEstudiante implements OnInit {
  formularioEstudiante!: FormGroup;
  programasDisponibles: string[] = [];
  cargando = false;

  // Propiedades del modal de verificación por código
  mostrarModalVerificacion = false;
  correoParaVerificar = '';
  mensajeErrorRegistro = '';
  codigoVerificacion = '';
  verificandoCodigo = false;
  mensajeVerificacionError = '';
  mensajeVerificacionExito = '';

  programasPorSede: { [key: string]: string[] } = {
    fusagasuga: [
      'Ingeniería de Sistemas',
      'Ingeniería Electrónica',
      'Administración de Empresas',
      'Ingenieria Agronimica',
      'Zootecnica',
      'Contaduria Publica,',
      'Lic Sociales',
      'Lic Edu Fisica'
    ],
    chia: [
      'Ingeniería de Sistemas',
      'Contaduría Pública',
      'Contaduria Publica',
      'Ingeniera Industrial',
      'Ingeniería Mecatrónica'
    ],
    soacha: [
      'Administración de Empresas',
      'Contaduría Pública',
      'Profesional en Ciencias del Deporte',
      'Ingeniería Industrial',
      'Ingeniería de Software',
      'Ingeniería Topográfica y Geomática'
    ],
    zipaquira: ['Música'],
    girardot: [
      'Enfermería',
      'Administración de Empresas',
      'Ingenieria Ambiental',
      'Ingenieria de Software'
    ],
    ubate: [
      'Administración de Empresas',
      'Contaduría Pública',
      'Ingeniería de Sistemas y Computación',
      'Medicina Veterinaria y Zootecnia'
    ]
  };

  constructor(
    private fb: FormBuilder,
    private estudiante: Estudiante,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  onSedeChange(event: any): void {
    const sedeSeleccionada = event.target.value;
    this.programasDisponibles = this.programasPorSede[sedeSeleccionada] || [];
    this.formularioEstudiante.get('programaAcademico')?.setValue('');
  }

  private inicializarFormulario(): void {
    this.formularioEstudiante = this.fb.group({
      documento: ['', Validators.required],
      nombreEstudiante: ['', Validators.required],
      apellidoEstudiante: ['', Validators.required],
      sede: ['', Validators.required],
      programaAcademico: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email, correoInstitucional]],
      contrasenia: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /** true si el campo fue tocado y tiene el error indicado (para mostrar el mensaje bajo el campo). */
  tieneError(campo: string, error?: string): boolean {
    const control = this.formularioEstudiante.get(campo);
    if (!control || !control.touched) return false;
    return error ? control.hasError(error) : control.invalid;
  }

  onSubmit(): void {
    this.mensajeErrorRegistro = '';
    if (this.formularioEstudiante.invalid) {
      this.formularioEstudiante.markAllAsTouched();
      this.mensajeErrorRegistro = this.formularioEstudiante.get('correo')?.hasError('correoInstitucional')
        ? 'Solo puedes registrarte con tu correo institucional @ucundinamarca.edu.co.'
        : 'Revisa los campos marcados antes de continuar.';
      return;
    }

    // Se envía como lo guarda el backend: sin espacios y en minúsculas
    const correoIngresado = normalizarCorreo(this.formularioEstudiante.get('correo')?.value);
    this.cargando = true;

    this.estudiante.registrarEstudiante({ ...this.formularioEstudiante.value, correo: correoIngresado }).subscribe({
      next: () => {
        this.cargando = false;
        this.correoParaVerificar = correoIngresado;
        this.codigoVerificacion = '';
        this.mensajeVerificacionError = '';
        this.mensajeVerificacionExito = '';
        this.mostrarModalVerificacion = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 409) {
          // La cuenta ya existe: puede que falte verificarla con el código enviado al correo
          this.correoParaVerificar = correoIngresado;
          this.mostrarModalVerificacion = true;
          this.mensajeVerificacionError =
            'Este correo o documento ya fue registrado. Si aún no verificaste tu cuenta, ingresa el código de 6 dígitos enviado a tu correo.';
        } else if (err.status === 400 && typeof err.error === 'string' && err.error) {
          this.mensajeErrorRegistro = err.error;
        } else {
          this.mensajeErrorRegistro = 'No fue posible completar el registro. Verifica tu conexión e inténtalo de nuevo.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  confirmarCodigoEstudiante(): void {
    this.mensajeVerificacionError = '';
    this.mensajeVerificacionExito = '';

    const codigo = this.codigoVerificacion.trim();
    if (!codigo || codigo.length < 6) {
      this.mensajeVerificacionError = 'Debes ingresar el código de 6 dígitos.';
      return;
    }

    this.verificandoCodigo = true;
    this.http.post(
      `${environment.baseUrl}/estudiantes/auth/verificar`,
      {
        email: this.correoParaVerificar.trim(),
        code: codigo
      },
      { responseType: 'text' }
    ).subscribe({
      next: (res) => {
        this.verificandoCodigo = false;
        this.mensajeVerificacionExito = res || 'Cuenta verificada exitosamente. Redirigiendo al login...';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.mostrarModalVerificacion = false;
          this.formularioEstudiante.reset();
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        this.verificandoCodigo = false;
        this.mensajeVerificacionError = typeof err.error === 'string' && err.error
          ? err.error
          : 'Código incorrecto o expirado. Verifica el código de 6 dígitos.';
        this.cdr.detectChanges();
      }
    });
  }
}