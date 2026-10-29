import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { Auth } from '../../../../core/services/auth';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';

export interface MiPostulacion {
  idPostulation: number;
  offerName: string;
  companyName: string;
  state: string;
  applicationDate: string;
  observations?: string;
}

@Component({
  selector: 'app-mis-postulaciones',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Footer],
  styleUrl: './mis-postulaciones.scss',
  templateUrl: './mis-postulaciones.html',
})
export class MisPostulaciones implements OnInit {
  postulaciones: MiPostulacion[] = [];
  cargando = true;
  mensajeError = '';
  usuarioDocumento = '';

  constructor(
    private authService: Auth,
    private postulacionService: PostulacionService
  ) {}

    ngOnInit(): void {
    const usuario = this.authService.getUsuarioActual();
    if (usuario) {
      this.usuarioDocumento = (usuario as any).documento || (usuario as any).documentNumber || '';
    }
    this.cargarPostulaciones();
  }

  cargarPostulaciones(): void {
    this.cargando = true;
    this.mensajeError = '';

    // Si aún no hay endpoint real en el backend, mostramos la vista vacía de inmediato
    // para que no se quede cargando para siempre.
    this.postulaciones = [];
    this.cargando = false;
  }
  

  getEstadoClase(estado: string): string {
    const est = estado.toUpperCase();
    if (est === 'ACEPTADA' || est === 'ACEPTADO') return 'badge-success';
    if (est === 'RECHAZADA' || est === 'RECHAZADO') return 'badge-danger';
    if (est === 'EN_REVISION' || est === 'EN REVISIÓN') return 'badge-warning';
    return 'badge-info';
  }
}
