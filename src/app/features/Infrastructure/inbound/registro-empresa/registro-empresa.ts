import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Empresa } from '../../../../core/services/empresa/empresa';
import { HttpClient } from '@angular/common/http';



@Component({
  standalone: true,
  imports: [RouterLink, Navbar, Footer, CommonModule, ReactiveFormsModule],
  selector: 'app-registro-empresa',
  styleUrl: './registro-empresa.scss',
  templateUrl: './registro-empresa.html',
})

export class RegistroEmpresa implements OnInit {
  formularioEmpresa: FormGroup;

  datosColombia: any[] = [];
  departamentos: string[] = [];
  municipiosFiltrados: string[] = [];

  constructor(
    private fb: FormBuilder, 
    private empresa: Empresa,
    private router: Router,
    private http: HttpClient
  ) {
    // 1. Construimos el formulario exactamente con los nombres que espera Spring Boot
    this.formularioEmpresa = this.fb.group({
      nit: ['', Validators.required],
      nombreEmpresa: ['', Validators.required],
      tipoEmpresa: ['', Validators.required],
      direccionEmpresa: ['', Validators.required],
      telefonoEmpresa: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      contrasenia: ['', Validators.required],
      nameRepresentive: ['', Validators.required],
      lastNameRepresentive: ['', Validators.required],
      numberDocument: ['', Validators.required],
      legalName: ['', Validators.required],
      department: ['', Validators.required],
      city: ['', Validators.required]
    });
  }
  ngOnInit() {
    this.cargarUbicaciones();
  }
  cargarUbicaciones() {
    // Usamos el archivo estático alojado en GitHub (Nunca se cae y responde instantáneamente)
    const urlApi = 'https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.min.json'; 
    
    this.http.get<any[]>(urlApi).subscribe({
      next: (data) => {
        // Guardamos el JSON completo en memoria
        this.datosColombia = data;
        
        // Extraemos solo los nombres de los departamentos y los ordenamos alfabéticamente
        this.departamentos = data.map(item => item.departamento).sort();
      },
      error: (err) => {
        console.error('Error cargando la API de GitHub', err);
        alert('Hubo un problema cargando los departamentos.');
      }
    });
  }

  // Se ejecuta cuando el usuario selecciona un departamento en el HTML
  onDepartamentoChange(event: Event) {
    const deptoSeleccionado = (event.target as HTMLSelectElement).value;
    
    // Buscamos el departamento exacto que eligió el usuario
    const departamentoEncontrado = this.datosColombia.find(item => item.departamento === deptoSeleccionado);
    
    if (departamentoEncontrado) {
      // Si lo encuentra, extrae su lista de ciudades y las ordena
      this.municipiosFiltrados = departamentoEncontrado.ciudades.sort();
    }

    // Reseteamos el campo ciudad por si la empresa se arrepiente y cambia de departamento
    this.formularioEmpresa.get('city')?.setValue('');
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
