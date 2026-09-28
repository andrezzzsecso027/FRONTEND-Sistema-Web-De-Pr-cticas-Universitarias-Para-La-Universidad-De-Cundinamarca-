import { Component } from '@angular/core';
import { RouterLink,Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../../../core/services/auth';
@Component({
  imports: [Navbar,Footer,RouterLink,CommonModule, ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasenia: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      alert('Por favor completa todos los campos.');
      return;
    }

    this.authService.login(this.loginForm.value).subscribe({
      next: (usuario) => {
        if (usuario.rolUsuario === 'administrador') {
          this.router.navigate(['/panel-administrador']);
        } else {
          alert(`Bienvenido ${usuario.rolUsuario}. Redirigiendo a tu perfil...`);
          // Redirigir a vista de estudiante/empresa o página principal
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error(err);
        alert('Credenciales inválidas. Revisa correo y contraseña.');
      }
    });
  }
}
