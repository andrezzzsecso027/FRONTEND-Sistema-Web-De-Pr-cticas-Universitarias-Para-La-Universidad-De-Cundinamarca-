import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.getRol() === 'administrador') {
    return true;
  }

  alert('Acceso denegado: solo el administrador puede acceder a este panel.');
  router.navigate(['/login']);
  return false;
};