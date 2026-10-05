import { Service } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginResponse {
  idUser: number;
  email: string;
  userRol: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})

export class Auth {
private apiUrl = 'http://localhost:8081/api/auth/login';

  constructor(private http: HttpClient, private router: Router) {}

  login(emailForm: string, passwordForm: string): Observable<any> {
    const payload = {
      email: emailForm,
      password: passwordForm
    };

    return this.http.post(this.apiUrl, payload);
  }

  getUsuarioActual(): LoginResponse | null {
    const data = localStorage.getItem('usuario_sesion');
    return data ? JSON.parse(data) : null;
  }

  getRol(): string | null {
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
