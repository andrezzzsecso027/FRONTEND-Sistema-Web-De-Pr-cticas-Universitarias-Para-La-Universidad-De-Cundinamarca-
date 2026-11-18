import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { RegistroEstudiante } from './registro-estudiante';
import { Estudiante } from '../../../../core/services/estudiante/estudiante';
import { environment } from '../../../../../environments/environment';

const URL_VERIFICAR = `${environment.baseUrl}/estudiantes/auth/verificar`;

describe('RegistroEstudiante', () => {
  let registrarEstudiante: ReturnType<typeof vi.fn>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  const crear = () => {
    const fixture = TestBed.createComponent(RegistroEstudiante);
    fixture.detectChanges();
    return fixture.componentInstance;
  };
  const llenar = (c: RegistroEstudiante, correo = 'Ana.Perez@UCundinamarca.edu.co') => c.formularioEstudiante.setValue({
    documento: '1001', nombreEstudiante: 'Ana', apellidoEstudiante: 'Pérez', sede: 'fusagasuga',
    programaAcademico: 'Ingeniería de Sistemas', direccion: 'Calle 1', telefono: '300', correo, contrasenia: 'Clave123'
  });

  beforeEach(() => {
    registrarEstudiante = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      imports: [RegistroEstudiante],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: Estudiante, useValue: { registrarEstudiante } }]
    });
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('al cambiar de sede carga sus programas y limpia el elegido', () => {
    const c = crear();
    c.formularioEstudiante.get('programaAcademico')?.setValue('X');
    c.onSedeChange({ target: { value: 'zipaquira' } });
    expect(c.programasDisponibles).toEqual(['Música']);
    expect(c.formularioEstudiante.get('programaAcademico')?.value).toBe('');
    c.onSedeChange({ target: { value: 'otra' } });
    expect(c.programasDisponibles).toEqual([]);
  });

  it('tieneError solo marca campos tocados', () => {
    const c = crear();
    expect(c.tieneError('documento')).toBe(false);
    c.formularioEstudiante.get('documento')?.markAsTouched();
    expect(c.tieneError('documento')).toBe(true);
    expect(c.tieneError('documento', 'required')).toBe(true);
    expect(c.tieneError('no-existe')).toBe(false);
  });

  it('rechaza el formulario inválido y explica si el correo no es institucional', () => {
    const c = crear();
    c.onSubmit();
    expect(c.mensajeErrorRegistro).toContain('Revisa los campos');

    llenar(c, 'ana@gmail.com');
    c.onSubmit();
    expect(c.mensajeErrorRegistro).toContain('correo institucional');
    expect(registrarEstudiante).not.toHaveBeenCalled();
  });

  it('registra con el correo normalizado y abre el modal de verificación', () => {
    const c = crear();
    llenar(c);
    c.onSubmit();
    expect(registrarEstudiante).toHaveBeenCalledWith(expect.objectContaining({ correo: 'ana.perez@ucundinamarca.edu.co' }));
    expect(c.mostrarModalVerificacion).toBe(true);
    expect(c.correoParaVerificar).toBe('ana.perez@ucundinamarca.edu.co');
  });

  it.each([
    [{ status: 409 }, 'mensajeVerificacionError', 'ya fue registrado'],
    [{ status: 400, error: 'Documento inválido' }, 'mensajeErrorRegistro', 'Documento inválido'],
    [{ status: 500 }, 'mensajeErrorRegistro', 'No fue posible completar']
  ])('error %o', (err, campo, mensaje) => {
    registrarEstudiante.mockReturnValue(throwError(() => err));
    const c = crear();
    llenar(c);
    c.onSubmit();
    expect((c as unknown as Record<string, string>)[campo]).toContain(mensaje);
    expect(c.cargando).toBe(false);
  });

  describe('verificación por código', () => {
    it('exige 6 dígitos', () => {
      const c = crear();
      c.codigoVerificacion = '1';
      c.confirmarCodigoEstudiante();
      expect(c.mensajeVerificacionError).toContain('6 dígitos');
    });

    it('verifica y redirige al login', () => {
      vi.useFakeTimers();
      const c = crear();
      c.correoParaVerificar = 'ana@ucundinamarca.edu.co';
      c.codigoVerificacion = '123456';
      c.confirmarCodigoEstudiante();
      http.expectOne(URL_VERIFICAR).flush('');
      expect(c.mensajeVerificacionExito).toContain('verificada');
      vi.advanceTimersByTime(1500);
      expect(c.mostrarModalVerificacion).toBe(false);
      expect(navegar).toHaveBeenCalledWith(['/login']);
      vi.useRealTimers();
    });

    it('muestra el error del backend o uno genérico', () => {
      const c = crear();
      c.codigoVerificacion = '999999';
      c.confirmarCodigoEstudiante();
      http.expectOne(URL_VERIFICAR).flush('Código expirado', { status: 400, statusText: 'Bad' });
      expect(c.mensajeVerificacionError).toBe('Código expirado');
      c.confirmarCodigoEstudiante();
      http.expectOne(URL_VERIFICAR).flush('', { status: 400, statusText: 'Bad' });
      expect(c.mensajeVerificacionError).toContain('Código incorrecto');
    });
  });
});
