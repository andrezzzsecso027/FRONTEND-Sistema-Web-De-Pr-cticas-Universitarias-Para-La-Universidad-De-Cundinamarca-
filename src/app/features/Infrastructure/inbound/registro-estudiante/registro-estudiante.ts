import { Component, OnInit } from '@angular/core';
import { RouterLink,Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { Estudiante } from '../../outbound/estudiante/estudiante';

@Component({
  imports: [RouterLink,Navbar,Footer,CommonModule,ReactiveFormsModule],
  standalone: true,
  selector: 'app-registro-estudiante',
  styleUrl: './registro-estudiante.scss',
  templateUrl: './registro-estudiante.html',
})
export class RegistroEstudiante implements OnInit {
  formularioEstudiante!: FormGroup;
  programasDisponibles: string[] = [];
  programasPorSede: { [key: string]: string[] } = {
    'fusagasuga': ['Ingeniería de Sistemas', 'Ingeniería Electrónica', 
    'Administración de Empresas','Ingenieria Agronimica','Zootecnica',
    'Contaduria Publica,','Lic Sociales','Lic Edu Fisica'],
    'chia': ['Ingeniería de Sistemas', 'Contaduría Pública','Contaduria Publica',
      'Ingeniera Industrial','Ingeniería Mecatrónica'],
    'soacha': ['Administración de Empresas', 'Contaduría Pública','Profesional en Ciencias del Deporte',
      'Ingeniería Industrial','Ingeniería de Software','Ingeniería Topográfica y Geomática'
    ],
    'zipaquira': ['Música'],
    'girardot': ['Enfermería', 'Administración de Empresas','Ingenieria Ambiental',
      'Ingenieria de Software'
    ],
    'ubate': ['Administración de Empresas', 'Contaduría Pública','Ingeniería de Sistemas y Computación',
      'Medicina Veterinaria y Zootecnia'
    ]
  };
  onSedeChange(event: any) {
    const sedeSeleccionada = event.target.value;

    this.programasDisponibles = this.programasPorSede[sedeSeleccionada] || [];
    this.formularioEstudiante.get('programaAcademico')?.setValue('');
  }

  constructor(
    private fb: FormBuilder,
    private estudiante: Estudiante,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.inicializarFormulario();
  }
  private inicializarFormulario() {
    this.formularioEstudiante = this.fb.group({
      documento: ['', Validators.required],
      nombreEstudiante: ['', Validators.required],
      apellidoEstudiante: ['', Validators.required],
      sede: ['', Validators.required],
      programaAcademico: ['', Validators.required],
      direccion: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      contrasenia: ['', Validators.required]
    });
  }
  onSubmit() {
    if (this.formularioEstudiante.valid) {
      this.estudiante.registrarEstudiante(this.formularioEstudiante.value).subscribe({
        next: (respuesta) => {
          alert('¡Estudiante registrado con éxito! Por favor verifica tu correo.');
          this.formularioEstudiante.reset();
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error(err);
          alert('Hubo un error al registrar el estudiante');
        }
      });
    } else {
      alert('Por favor, llena todos los campos correctamente.');
    }
  }
}
