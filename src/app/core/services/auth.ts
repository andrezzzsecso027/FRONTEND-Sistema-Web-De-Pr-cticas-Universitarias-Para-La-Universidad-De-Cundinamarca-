import { Service } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginResponse {
  idUsuario: number;
  correo: string;
  rolUsuario: string;
}

@Injectable({
  providedIn: 'root'
})

export class Auth {
private apiUrl = 'http://localhost:8081/api/autenticacion/login';

  constructor(private http: HttpClient, private router: Router) {}

  login(credenciales: { correo: string; contrasenia: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl, credenciales).pipe(
      tap((usuario) => {
        localStorage.setItem('usuario_sesion', JSON.stringify(usuario));
      })
    );
  }

  getUsuarioActual(): LoginResponse | null {
    const data = localStorage.getItem('usuario_sesion');
    return data ? JSON.parse(data) : null;
  }

  getRol(): string | null {
    const usuario = this.getUsuarioActual();
    return usuario ? usuario.rolUsuario : null;
  }

  isLoggedIn(): boolean {
    return !!this.getUsuarioActual();
  }

  logout(): void {
    localStorage.removeItem('usuario_sesion');
    this.router.navigate(['/login']);
  }
}
