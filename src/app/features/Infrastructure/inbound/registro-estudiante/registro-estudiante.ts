import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
@Component({
  imports: [RouterLink,Navbar,Footer],
  selector: 'app-registro-estudiante',
  styleUrl: './registro-estudiante.scss',
  templateUrl: './registro-estudiante.html',
})
export class RegistroEstudiante {}
