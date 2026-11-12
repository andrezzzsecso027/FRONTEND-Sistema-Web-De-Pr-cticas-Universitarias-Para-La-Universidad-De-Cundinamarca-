import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

  urlPdfNitSubido = '';
  nombrePdfSeleccionado = '';
  subiendoPdf = false;
  enviandoRegistro = false;

  mensajeError = '';
  mensajeExito = '';

  constructor(
    private fb: FormBuilder,
    private empresa: Empresa,
    private router: Router,
    private http: HttpClient,
    private empresaService: Empresa,
    private cdr: ChangeDetectorRef
  ) {
    this.formularioEmpresa = this.fb.group({
      nit: ['', Validators.required],
      nombreEmpresa: ['', Validators.required],
      tipoEmpresa: ['', Validators.required],
      direccionEmpresa: ['', Validators.required],
      telefonoEmpresa: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      contrasenia: ['', [Validators.required, Validators.minLength(6)]],
      nameRepresentive: ['', Validators.required],
      lastNameRepresentive: ['', Validators.required],
      numberDocument: ['', Validators.required],
      legalName: ['', Validators.required],
      department: ['', Validators.required],
      city: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarUbicaciones();
  }

  cargarUbicaciones(): void {
    const urlApi = 'https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.min.json';

    this.http.get<any[]>(urlApi).subscribe({
      next: (data) => {
        this.datosColombia = data || [];
        this.departamentos = this.datosColombia.map(item => item.departamento).sort();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando departamentos', err);
      }
    });
  }

  onDepartamentoChange(event: Event): void {
    const deptoSeleccionado = (event.target as HTMLSelectElement).value;
    const departamentoEncontrado = this.datosColombia.find(
      item => item.departamento === deptoSeleccionado
    );

    if (departamentoEncontrado) {
      this.municipiosFiltrados = [...departamentoEncontrado.ciudades].sort();
    } else {
      this.municipiosFiltrados = [];
    }

    this.formularioEmpresa.get('city')?.setValue('');
    this.cdr.detectChanges();
  }

  onSeleccionarPdfRegistro(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.nombrePdfSeleccionado = file.name;
    this.subiendoPdf = true;
    this.mensajeError = '';
    this.cdr.detectChanges();

    this.empresaService.subirArchivoCloudinary(file, 'empresas_nit').subscribe({
      next: (res: { url: string }) => {
        this.urlPdfNitSubido = res.url;
        this.subiendoPdf = false;

        const nitActual = this.formularioEmpresa.get('nit')?.value;
        if (nitActual) {
          localStorage.setItem(`pdf_${nitActual.trim()}`, res.url);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.subiendoPdf = false;
        this.mensajeError = 'No fue posible subir el archivo PDF a Cloudinary. Intenta nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.formularioEmpresa.invalid) {
      this.formularioEmpresa.markAllAsTouched();
      this.mensajeError = 'Por favor completa todos los campos obligatorios del formulario corporativo.';
      return;
    }

    if (!this.urlPdfNitSubido) {
      this.mensajeError = 'Debes adjuntar el certificado RUT / NIT en formato PDF para la auditoría del administrador.';
      return;
    }

    this.enviandoRegistro = true;
    const valores = this.formularioEmpresa.value;

    // Respaldamos en localStorage y enviamos urlPdfNit al Backend
    if (valores.nit) {
      localStorage.setItem(`pdf_${valores.nit.trim()}`, this.urlPdfNitSubido);
    }

    const payload = {
      ...valores,
      urlPdfNit: this.urlPdfNitSubido
    };

    this.empresa.registrarEmpresa(payload).subscribe({
      next: () => {
        this.enviandoRegistro = false;
        this.mensajeExito = 'Solicitud corporativa registrada con éxito. Tu cuenta será habilitada tras la verificación del RUT/NIT por Coordinación UdeC.';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.formularioEmpresa.reset();
          this.router.navigate(['/login']);
        }, 2200);
      },
      error: (err) => {
        this.enviandoRegistro = false;
        console.error(err);
        this.mensajeError = typeof err.error === 'string' && err.error
          ? err.error
          : 'Error al registrar la empresa. Verifica que el NIT o correo no estén registrados previamente.';
        this.cdr.detectChanges();
      }
    });
  }
}