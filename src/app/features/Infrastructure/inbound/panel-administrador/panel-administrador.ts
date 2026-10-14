import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { Estudiante } from '../../../../core/services/estudiante/estudiante';
import { Admin, Company } from '../../../../core/services/admin/admin';

@Component({
  imports: [CommonModule, Navbar, Footer],
  selector: 'app-panel-administrador',
  styleUrl: './panel-administrador.scss',
  templateUrl: './panel-administrador.html',
})
export class PanelAdministrador implements OnInit {
  estudiantes: any[] = [];
  empresasPendientes: Company[] = [];

  cargandoEstudiantes = false;
  cargandoEmpresas = false;
  procesandoNit: string | null = null;
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private estudiante: Estudiante,
    private admin: Admin
  ) {}

  ngOnInit(): void {
    this.cargarEstudiantes();
    this.cargarEmpresasPendientes();
  }

  cargarEstudiantes(): void {
    this.cargandoEstudiantes = true;
    this.estudiante.obtenerEstudiantes().subscribe({
      next: (data) => {
        this.estudiantes = data;
        this.cargandoEstudiantes = false;
      },
      error: (err) => {
        console.error('[PanelAdmin] Error cargando estudiantes:', err);
        this.cargandoEstudiantes = false;
      }
    });
  }

  cargarEmpresasPendientes(): void {
    this.cargandoEmpresas = true;
    this.admin.obtenerEmpresasPendientes().subscribe({
      next: (data) => {
        this.empresasPendientes = data;
        this.cargandoEmpresas = false;
      },
      error: (err) => {
        console.error('[PanelAdmin] Error cargando empresas:', err);
        this.cargandoEmpresas = false;
        this.mensajeError = 'No se pudieron cargar las empresas pendientes.';
      }
    });
  }

  aprobarEmpresa(nit: string): void {
    this.procesarEmpresa(nit, true);
  }

  rechazarEmpresa(nit: string): void {
    this.procesarEmpresa(nit, false);
  }

  private procesarEmpresa(nit: string, aprobada: boolean): void {
    this.procesandoNit = nit;
    this.mensajeExito = '';
    this.mensajeError = '';

    this.admin.verificarEmpresa(nit, aprobada).subscribe({
      next: (respuesta) => {
        this.procesandoNit = null;
        this.mensajeExito = respuesta || (aprobada ? 'Empresa aprobada.' : 'Empresa rechazada.');
        this.cargarEmpresasPendientes();
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: (err) => {
        this.procesandoNit = null;
        console.error('[PanelAdmin] Error verificando empresa:', err);
        this.mensajeError = 'Error al procesar la empresa. Intenta de nuevo.';
        setTimeout(() => this.mensajeError = '', 3000);
      }
    });
  }
}
