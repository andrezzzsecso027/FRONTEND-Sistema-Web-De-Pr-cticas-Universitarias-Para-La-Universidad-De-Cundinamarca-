import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const DOMINIO_INSTITUCIONAL = '@ucundinamarca.edu.co';

/** Mismo patrón que valida el backend (StudentUseCaseUseCaseImpl): usuario válido + dominio exacto. */
const PATRON = /^[a-z0-9._%+-]+@ucundinamarca\.edu\.co$/;

/** Normaliza el correo como lo guarda el backend: sin espacios y en minúsculas. */
export function normalizarCorreo(valor: unknown): string {
  return String(valor ?? '').trim().toLowerCase();
}

/**
 * Exige un correo institucional de la Universidad (@ucundinamarca.edu.co).
 * Error: `{ correoInstitucional: true }`. Un campo vacío lo deja a `Validators.required`.
 */
export const correoInstitucional: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const correo = normalizarCorreo(control.value);
  if (!correo) return null;
  return PATRON.test(correo) ? null : { correoInstitucional: true };
};
