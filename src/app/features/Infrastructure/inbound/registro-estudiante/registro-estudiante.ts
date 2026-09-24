import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
@Component({
  imports: [RouterLink,Navbar,Footer,CommonModule],
  selector: 'app-registro-estudiante',
  styleUrl: './registro-estudiante.scss',
  templateUrl: './registro-estudiante.html',
})
export class RegistroEstudiante {
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
  }
}
