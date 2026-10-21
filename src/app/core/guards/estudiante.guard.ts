import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const estudianteGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.getRol() === 'estudiante') {
    return true;
  }

  console.warn('[estudianteGuard] Acceso denegado: se requiere rol estudiante');
  router.navigate(['/login']);
  return false;
};
