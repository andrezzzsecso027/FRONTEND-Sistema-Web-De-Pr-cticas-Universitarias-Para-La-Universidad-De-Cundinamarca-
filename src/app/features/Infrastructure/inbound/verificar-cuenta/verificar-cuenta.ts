import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-verificar-cuenta',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, Navbar, Footer],
  styleUrl: './verificar-cuenta.scss',
  templateUrl: './verificar-cuenta.html',
})
export class VerificarCuenta {
  verificarForm: FormGroup;
  cargando = false;
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.verificarForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.verificarForm.invalid) {
      this.verificarForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const url = `${environment.baseUrl}${environment.endpoints.verificacion}/verificar`;

    this.http.post(url, this.verificarForm.value, { responseType: 'text' }).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.mensajeExito = respuesta || 'Cuenta verificada exitosamente. Redirigiendo al login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2500);
      },
      error: (err) => {
        this.cargando = false;
        console.error('[VerificarCuenta] Error:', err);
        if (err.status === 400) {
          this.mensajeError = 'El código es incorrecto o ya expiró.';
        } else if (err.status === 404) {
          this.mensajeError = 'No existe una cuenta con ese correo.';
        } else {
          this.mensajeError = 'Error al verificar la cuenta. Intenta de nuevo.';
        }
      }
    });
  }
}
