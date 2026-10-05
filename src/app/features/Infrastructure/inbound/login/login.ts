import { Component } from '@angular/core';
import { RouterLink,Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '../../../../core/services/auth';
import { email } from '@angular/forms/signals';
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
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      alert('Por favor completa todos los campos.');
      return;
    }
    const { email, password } = this.loginForm.value;

    this.authService.login(email,password).subscribe({
      next: (response) => {
       localStorage.setItem('token', response.token);
        localStorage.setItem('usuario_sesion', JSON.stringify(response));

        if (response.userRol === 'administrador') {
          this.router.navigate(['/panel-administrador']);
        } else {
          alert(`Bienvenido. Redirigiendo a tu perfil...`);
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
