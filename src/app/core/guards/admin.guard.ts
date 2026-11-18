import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.getRol() === 'administrador') {
    return true;
  }

  console.warn('[adminGuard] Acceso denegado: se requiere rol administrador');
  // Con sesión de otro rol se le envía a su propio panel; sin sesión, al login.
  return router.parseUrl(auth.isLoggedIn() ? auth.rutaInicio() : '/login');
};
