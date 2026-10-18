import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
import { OfertaService, OfferRequestDTO } from '../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { Auth } from '../../../../core/services/auth';

@Component({
  selector: 'app-oferta-lista',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  styleUrl: './oferta-lista.scss',
  templateUrl: './oferta-lista.html',
})

export class OfertaLista implements OnInit {
  ofertas: OfferRequestDTO[] = [];
  cargando = true;
  mensajeExito = '';
  mensajeError = '';
  procesandoId: number | null = null;

  constructor(
    private ofertaService: OfertaService,
    private postulacionService: PostulacionService,
    private authService: Auth
  ) {}

  ngOnInit(): void {
    this.cargarOfertas();
  }

  cargarOfertas(): void {
    this.cargando = true;
    this.ofertaService.obtenerOfertasActivas().subscribe({
      next: (data: OfferRequestDTO[]) => {
        this.ofertas = data || [];
        this.cargando = false;
      },
      error: (err: any) => {
        console.error('[OfertaLista] Error:', err);
        this.cargando = false;
        if (err.status === 204) {
          this.ofertas = [];
        } else {
          this.mensajeError = 'No se pudieron cargar las ofertas.';
        }
      }
    });
  }

  postularme(oferta: OfferRequestDTO): void {
    const usuario = this.authService.getUsuarioActual();
    if (!usuario) {
      this.mensajeError = 'Debes iniciar sesión para postularte.';
      setTimeout(() => this.mensajeError = '', 3000);
      return;
    }

    const documento = (usuario as any).documento || (usuario as any).idUser?.toString();

    if (!documento) {
      this.mensajeError = 'No se pudo identificar tu documento.';
      setTimeout(() => this.mensajeError = '', 3000);
      return;
    }

    this.procesandoId = oferta.idOffer ?? null;
    this.mensajeError = '';
    this.mensajeExito = '';

    this.postulacionService.aplicarAOferta({
      idOffer: oferta.idOffer!,
      documentNumberStudent: documento
    }).subscribe({
      next: () => {
        this.procesandoId = null;
        this.mensajeExito = `Te postulaste a "${oferta.practiceName}" exitosamente.`;
        setTimeout(() => this.mensajeExito = '', 4000);
      },
      error: (err) => {
        this.procesandoId = null;
        console.error('[OfertaLista] Error al postularse:', err);
        if (err.status === 409) {
          this.mensajeError = 'Ya te postulaste a esta oferta.';
        } else {
          this.mensajeError = 'Error al postularte. Intenta de nuevo.';
        }
        setTimeout(() => this.mensajeError = '', 4000);
      }
    });
  }

  formatearSalario(salario: number): string {
    if (!salario) return 'No especificado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(salario);
  }
}
