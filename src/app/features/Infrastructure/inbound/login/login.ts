import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../../../core/services/auth';

@Component({
  imports: [Navbar, Footer, RouterLink, CommonModule, ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  loginForm: FormGroup;
  cargando = false;
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
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
          this.router.navigate(['/ofertas']); // RUTA CORREGIDA
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.cargando = false;
        console.error('[Login] Error:', err);
        if (err.status === 401 || err.status === 403) {
          this.mensajeError = 'Credenciales inválidas o cuenta pendiente de verificación.';
        } else if (err.status === 0) {
          this.mensajeError = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
        } else {
          this.mensajeError = 'Error al iniciar sesión. Intenta de nuevo.';
        }
      }
    });
  }
}
