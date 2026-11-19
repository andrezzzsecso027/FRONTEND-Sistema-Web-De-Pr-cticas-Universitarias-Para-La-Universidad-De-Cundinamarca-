import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../../core/services/auth';
import { environment } from '../../../../../environments/environment';

@Component({
  imports: [Navbar, Footer, RouterLink, CommonModule, ReactiveFormsModule],
  standalone: true,
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  loginForm: FormGroup;
  cargando = false;
  mensajeError = '';

  // Propiedades del modal de activación por código
  mostrarModalVerificacion = false;
  correoParaVerificar = '';
  codigoVerificacion = '';
  verificandoCodigo = false;
  mensajeVerificacionError = '';
  mensajeVerificacionExito = '';
  /** Aviso tras registrar una empresa: su cuenta queda pendiente de aprobación por Coordinación. */
  avisoRegistroEmpresa = false;
  correoRegistrado = '';

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    const estado = (globalThis.history?.state ?? {}) as { avisoRegistroEmpresa?: boolean; correoRegistrado?: string };
    if (estado.avisoRegistroEmpresa) {
      this.avisoRegistroEmpresa = true;
      this.correoRegistrado = estado.correoRegistrado ?? '';
      if (this.correoRegistrado) this.loginForm.patchValue({ email: this.correoRegistrado });
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    const { email, password } = this.loginForm.value;
    const correoLimpio = String(email || '').trim();

    this.authService.login(correoLimpio, password).subscribe({
      next: (response) => {
        this.cargando = false;
        localStorage.setItem('token', response.token);
        localStorage.setItem('usuario_sesion', JSON.stringify(response));

        const rol = response.userRol?.toLowerCase();

        if (rol === 'administrador') {
          this.router.navigate(['/panel-administrador']);
        } else if (rol === 'empresa') {
          this.router.navigate(['/panel-empresa']);
        } else if (rol === 'estudiante') {
          this.router.navigate(['/ofertas']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.cargando = false;
        console.error('[Login] Error:', err);

        if (err.status === 403 && correoLimpio.toLowerCase().endsWith('@ucundinamarca.edu.co')) {
          this.correoParaVerificar = correoLimpio;
          this.codigoVerificacion = '';
          this.mensajeVerificacionError = '';
          this.mensajeVerificacionExito = '';
          this.mostrarModalVerificacion = true;
          this.mensajeError = 'Tu cuenta estudiantil aún no está activada. Ingresa el código enviado a tu correo.';
        } else if (err.status === 403) {
          this.mensajeError = 'Tu cuenta de empresa aún está pendiente de verificación por el administrador.';
        } else if (err.status === 401) {
          this.mensajeError = 'Correo o contraseña incorrectos.';
        } else if (err.status === 0) {
          this.mensajeError = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
        } else {
          this.mensajeError = 'Error al iniciar sesión. Intenta de nuevo.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  confirmarCodigoDesdeLogin(): void {
    this.mensajeVerificacionError = '';
    this.mensajeVerificacionExito = '';

    const codigo = this.codigoVerificacion.trim();
    if (!codigo || codigo.length < 6) {
      this.mensajeVerificacionError = 'Ingresa el código de 6 dígitos.';
      return;
    }

    this.verificandoCodigo = true;
    this.http.post(
      `${environment.baseUrl}/estudiantes/auth/verificar`,
      {
        email: this.correoParaVerificar,
        code: codigo
      },
      { responseType: 'text' }
    ).subscribe({
      next: (res) => {
        this.verificandoCodigo = false;
        this.mensajeVerificacionExito = res || 'Cuenta activada exitosamente. Iniciando sesión...';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.mostrarModalVerificacion = false;
          this.onSubmit();
        }, 1200);
      },
      error: (err) => {
        this.verificandoCodigo = false;
        this.mensajeVerificacionError = typeof err.error === 'string' && err.error
          ? err.error
          : 'El código ingresado es incorrecto o ha expirado.';
        this.cdr.detectChanges();
      }
    });
  }
}