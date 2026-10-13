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

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('usuario_sesion');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
