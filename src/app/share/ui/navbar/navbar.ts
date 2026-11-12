import { Component, HostListener } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth';

@Component({
  imports: [RouterLink, CommonModule],
  standalone: true,
  selector: 'app-navbar',
  styleUrl: './navbar.scss',
  templateUrl: './navbar.html',
})
export class Navbar {
  menuRegistroAbierto = false;

  constructor(
    public authService: Auth,
    private router: Router
  ) {}

  @HostListener('document:click')
  cerrarMenuAlClickAfuera(): void {
    this.menuRegistroAbierto = false;
  }

  toggleMenuRegistro(event: Event): void {
    event.stopPropagation();
    this.menuRegistroAbierto = !this.menuRegistroAbierto;
  }

  cerrarMenuRegistro(): void {
    this.menuRegistroAbierto = false;
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get userRole(): string | null {
    return this.authService.getRol();
  }

  get userName(): string {
    const usuario = this.authService.getUsuarioActual();
    return usuario ? (usuario.email || 'Usuario') : 'Usuario';
  }

  logout(): void {
    this.authService.logout();
  }
}