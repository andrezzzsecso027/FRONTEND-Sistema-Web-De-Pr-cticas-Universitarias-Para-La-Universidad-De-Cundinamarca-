import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UpdatePasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}
@Injectable({
  providedIn: 'root'
})
export class UpdatePasswordService{
    private readonly authUrl = `${environment.baseUrl}/auth`;
    constructor(private readonly http: HttpClient) {}

  cambiarContrasena(payload: UpdatePasswordRequest): Observable<string> {
    return this.http.patch(`${this.authUrl}/cambiar-contrasena`, payload, {
      responseType: 'text'
    });
  }
  obtenerEmailDeSesion(): string {
    try {
      const sesionRaw = localStorage.getItem('usuario_sesion');
      if (sesionRaw) {
        const sesion = JSON.parse(sesionRaw);
        if (sesion.email) return sesion.email;
        if (sesion.correo) return sesion.correo;
        if (sesion.correoElectronico) return sesion.correoElectronico;
      }
      const token = localStorage.getItem('token');
      if (token && token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.sub) return payload.sub;
      }
    } catch {
      // Fallback vacío si no hay sesión válida
    }
    return '';
  }
}