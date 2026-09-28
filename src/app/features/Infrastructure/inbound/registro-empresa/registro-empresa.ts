import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Empresa } from '../../outbound/empresa/empresa';


@Component({
  standalone: true,
  imports: [RouterLink, Navbar, Footer, CommonModule, ReactiveFormsModule],
  selector: 'app-registro-empresa',
  styleUrl: './registro-empresa.scss',
  templateUrl: './registro-empresa.html',
})

export class RegistroEmpresa {
  formularioEmpresa: FormGroup;
  constructor(
    private fb: FormBuilder, 
    private empresa: Empresa,
    private router: Router
  ) {
    // 1. Construimos el formulario exactamente con los nombres que espera Spring Boot
    this.formularioEmpresa = this.fb.group({
      nit: ['', Validators.required],
      nombreEmpresa: ['', Validators.required],
      tipoEmpresa: ['', Validators.required],
      direccionEmpresa: ['', Validators.required],
      telefonoEmpresa: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      contrasenia: ['', Validators.required]
    });
  }

  // 2. Función que se ejecuta al darle "Solicitar registro"
  onSubmit() {
    if (this.formularioEmpresa.valid) {
      this.empresa.registrarEmpresa(this.formularioEmpresa.value).subscribe({
        next: (respuesta) => {
          alert('¡Empresa registrada con éxito! Esperando aprobación.');
          this.formularioEmpresa.reset();
          this.router.navigate(['/login']); // Redirige al login
        },
        error: (err) => {
          console.error(err);
          alert('Hubo un error al registrar la empresa. Revisa la consola.');
        }
      });
    } else {
      alert('Por favor, llena todos los campos correctamente.');
    }
  }
}
