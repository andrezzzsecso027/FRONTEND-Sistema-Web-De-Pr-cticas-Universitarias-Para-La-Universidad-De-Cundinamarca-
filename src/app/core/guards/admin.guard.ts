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
  router.navigate(['/login']);
  return false;
};
