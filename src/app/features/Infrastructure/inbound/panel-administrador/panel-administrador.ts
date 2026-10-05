import { Component } from '@angular/core';
import {  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { Estudiante } from '../../../../core/services/estudiante/estudiante'; 
import { Empresa } from '../../../../core/services/empresa/empresa';

@Component({
  imports: [CommonModule, Navbar, Footer],
  selector: 'app-panel-administrador',
  styleUrl: './panel-administrador.scss',
  templateUrl: './panel-administrador.html',
})
export class PanelAdministrador implements OnInit{ 
  estudiantes: any[] = [];
  empresas: any[] = [];

  constructor(
    private estudiante: Estudiante,
    private empresa: Empresa
  ) {}

  ngOnInit(): void {
    this.cargarEstudiantes();
    this.cargarEmpresas();
  }

  cargarEstudiantes() {
    this.estudiante.obtenerEstudiantes().subscribe({
      next: (data) => this.estudiantes = data,
      error: (err) => console.error('Error cargando estudiantes', err)
    });
  }

  cargarEmpresas() {
    this.empresa.obtenerEmpresas().subscribe({
      next: (data) => this.empresas = data,
      error: (err) => console.error('Error cargando empresas', err)
    });
  }
}
