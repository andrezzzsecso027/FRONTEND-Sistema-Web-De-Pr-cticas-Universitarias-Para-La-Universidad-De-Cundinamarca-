import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../services/auth';

/**
 * Adjunta "Authorization: Bearer <token>" a todas las peticiones hacia NUESTRA API.
 * - No lo envía a APIs de terceros (p. ej. el JSON de departamentos en GitHub).
 * - Si el backend responde 401 (token expirado/inválido), cierra la sesión y lleva al login.
 *   Se excluye /auth/** porque ahí un 401 significa "credenciales/contraseña incorrecta",
 *   no "sesión vencida".
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const esNuestraApi = req.url.startsWith(environment.baseUrl);
  const token = localStorage.getItem('token');

  const request =
    esNuestraApi && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const esEndpointDeAuth = req.url.startsWith(`${environment.baseUrl}${environment.endpoints.auth}/`);
      if (error.status === 401 && esNuestraApi && token && !esEndpointDeAuth) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
