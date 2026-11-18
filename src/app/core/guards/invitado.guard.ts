import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { ConfirmarCierreSesion } from '../services/sesion/confirmar-cierre-sesion';

/**
 * Protege las páginas públicas (inicio, login, registro). Si el usuario ya tiene sesión
 * y llega a una de ellas (flecha "atrás" del navegador, URL escrita a mano...), se le
 * pregunta si quiere cerrar sesión:
 *  - Sí → se limpia la sesión y continúa a la página pública.
 *  - No → se cancela la navegación y se queda en su panel.
 */
export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  // inject() antes del await: después de él ya no hay contexto de inyección.
  const confirmacion = inject(ConfirmarCierreSesion);

  if (!auth.isLoggedIn()) return true;

  const cerrar = await confirmacion.preguntar();
  if (cerrar) {
    auth.limpiarSesion();
    return true;
  }

  // En la primera carga (URL escrita o recarga) no hay página a la cual "quedarse": se envía a su panel.
  return router.navigated ? false : router.parseUrl(auth.rutaInicio());
};
