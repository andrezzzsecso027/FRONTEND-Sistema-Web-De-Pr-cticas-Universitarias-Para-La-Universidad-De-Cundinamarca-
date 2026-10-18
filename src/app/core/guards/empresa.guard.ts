import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const empresaGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const rol = auth.getRol()?.toLowerCase();

  if (auth.isLoggedIn() && rol === 'empresa') {
    return true;
  }

  console.warn('[empresaGuard] Acceso denegado: se requiere rol empresa');
  router.navigate(['/login']);
  return false;
};