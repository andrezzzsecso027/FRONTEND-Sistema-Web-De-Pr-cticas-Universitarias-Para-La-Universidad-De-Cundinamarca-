import { Component } from '@angular/core';
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
  constructor(
    public authService: Auth,
    private router: Router
  ) {}

  // Verifica si el usuario está logueado
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // Obtiene el rol del usuario
  get userRole(): string | null {
    return this.authService.getRol();
  }

  // Obtiene el nombre/email para mostrar
  get userName(): string {
    const usuario = this.authService.getUsuarioActual();
    return usuario ? (usuario.email || 'Usuario') : 'Usuario';
  }

  // Cierra sesión
  logout(): void {
    this.authService.logout();
  }
}
