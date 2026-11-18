import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export type UserRol = 'estudiante' | 'empresa' | 'administrador';

export interface LoginResponse {
  idUser: number;
  email: string;
  userRol: UserRol;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.login}`;

  constructor(private http: HttpClient, private router: Router) {}

  login(emailForm: string, passwordForm: string): Observable<LoginResponse> {
    const payload = {
      email: emailForm,
      password: passwordForm
    };
    return this.http.post<LoginResponse>(this.apiUrl, payload);
  }

  getUsuarioActual(): LoginResponse | null {
    const data = localStorage.getItem('usuario_sesion');
    return data ? JSON.parse(data) : null;
  }

  getRol(): UserRol | null {
    const usuario = this.getUsuarioActual();
    return usuario ? usuario.userRol : null;
  }

  /** Hay sesión solo si existe un token y aún no ha expirado (claim "exp" del JWT). */
  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadBase64));
      return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /** Ruta de inicio según el rol (a donde se redirige tras el login). */
  rutaInicio(): string {
    switch (this.getRol()?.toLowerCase()) {
      case 'administrador': return '/panel-administrador';
      case 'empresa': return '/panel-empresa';
      case 'estudiante': return '/ofertas';
      default: return '/';
    }
  }

  /** Borra el token, el usuario y los datos cacheados por los paneles, sin navegar. */
  limpiarSesion(): void {
    ['token', 'usuario_sesion', 'nitEmpresa', 'nombreEmpresaReal', 'documento_estudiante']
      .forEach((k) => localStorage.removeItem(k));
  }

  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }
}
