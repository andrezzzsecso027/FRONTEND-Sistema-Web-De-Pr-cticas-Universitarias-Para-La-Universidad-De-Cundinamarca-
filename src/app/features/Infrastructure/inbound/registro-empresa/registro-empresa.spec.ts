import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { RegistroEmpresa } from './registro-empresa';
import { Empresa } from '../../../../core/services/empresa/empresa';

const URL_COLOMBIA = 'https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.min.json';

describe('RegistroEmpresa', () => {
  let empresa: Record<string, ReturnType<typeof vi.fn>>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  const crear = () => {
    const fixture = TestBed.createComponent(RegistroEmpresa);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  const archivo = (nombre: string, tipo: string, tamano = 100) => {
    const f = new File(['x'], nombre, { type: tipo });
    Object.defineProperty(f, 'size', { value: tamano });
    return f;
  };
  const evento = (f?: File) => ({ target: { files: f ? [f] : [], value: 'C:/fake' } }) as unknown as Event;

  const llenar = (c: RegistroEmpresa) => c.formularioEmpresa.setValue({
    nit: '900123', nombreEmpresa: 'Nexus', tipoEmpresa: 'SAS', direccionEmpresa: 'Cra 1', telefonoEmpresa: '300',
    correo: 'rh@nexus.co', contrasenia: 'Clave123', nameRepresentive: 'Laura', lastNameRepresentive: 'Ruiz',
    numberDocument: '55', legalName: 'Nexus SAS', department: 'Cundinamarca', city: 'Fusagasugá'
  });

  beforeEach(() => {
    empresa = {
      subirArchivoCloudinary: vi.fn(() => of({ url: 'https://cdn/nit.pdf' })),
      registrarEmpresa: vi.fn(() => of({}))
    };
    TestBed.configureTestingModule({
      imports: [RegistroEmpresa],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: Empresa, useValue: empresa }]
    });
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('carga departamentos y filtra municipios al elegir uno', () => {
    const c = crear();
    http.expectOne(URL_COLOMBIA).flush([
      { departamento: 'Cundinamarca', ciudades: ['Soacha', 'Fusagasugá'] },
      { departamento: 'Antioquia', ciudades: ['Medellín'] }
    ]);
    expect(c.departamentos).toEqual(['Antioquia', 'Cundinamarca']);

    c.onDepartamentoChange({ target: { value: 'Cundinamarca' } } as unknown as Event);
    expect(c.municipiosFiltrados).toEqual(['Fusagasugá', 'Soacha']);
    c.onDepartamentoChange({ target: { value: 'No existe' } } as unknown as Event);
    expect(c.municipiosFiltrados).toEqual([]);
  });

  it('si falla la API de ubicaciones no rompe', () => {
    const c = crear();
    http.expectOne(URL_COLOMBIA).flush('', { status: 500, statusText: 'Error' });
    expect(c.departamentos).toEqual([]);
  });

  describe('certificado NIT', () => {
    it('ignora si no se eligió archivo y rechaza no-PDF o mayor a 10 MB', () => {
      const c = crear();
      c.onSeleccionarPdfRegistro(evento());
      expect(empresa['subirArchivoCloudinary']).not.toHaveBeenCalled();

      c.onSeleccionarPdfRegistro(evento(archivo('foto.png', 'image/png')));
      expect(c.mensajeError).toContain('PDF');

      c.onSeleccionarPdfRegistro(evento(archivo('nit.pdf', 'application/pdf', 11 * 1024 * 1024)));
      expect(c.mensajeError).toContain('10 MB');
      expect(empresa['subirArchivoCloudinary']).not.toHaveBeenCalled();
    });

    it('sube el PDF y lo respalda por NIT', () => {
      const c = crear();
      llenar(c);
      c.onSeleccionarPdfRegistro(evento(archivo('nit.pdf', 'application/pdf')));
      expect(c.urlPdfNitSubido).toBe('https://cdn/nit.pdf');
      expect(c.nombrePdfSeleccionado).toBe('nit.pdf');
      expect(localStorage.getItem('pdf_900123')).toBe('https://cdn/nit.pdf');
    });

    it('muestra el motivo si la subida falla', () => {
      empresa['subirArchivoCloudinary'].mockReturnValue(throwError(() => ({ error: { error: 'PDF dañado' } })));
      const c = crear();
      c.onSeleccionarPdfRegistro(evento(archivo('NIT.PDF', '')));
      expect(c.mensajeError).toBe('PDF dañado');
      expect(c.subiendoPdf).toBe(false);

      empresa['subirArchivoCloudinary'].mockReturnValue(throwError(() => ({})));
      c.onSeleccionarPdfRegistro(evento(archivo('nit.pdf', 'application/pdf')));
      expect(c.mensajeError).toContain('No fue posible subir');
    });
  });

  describe('onSubmit', () => {
    it('pide completar el formulario y adjuntar el PDF', () => {
      const c = crear();
      c.onSubmit();
      expect(c.mensajeError).toContain('completa todos los campos');

      llenar(c);
      c.onSubmit();
      expect(c.mensajeError).toContain('certificado RUT / NIT');
      expect(empresa['registrarEmpresa']).not.toHaveBeenCalled();
    });

    it('registra con la URL del PDF y redirige al login', () => {
      vi.useFakeTimers();
      const c = crear();
      llenar(c);
      c.urlPdfNitSubido = 'https://cdn/nit.pdf';
      c.onSubmit();
      expect(empresa['registrarEmpresa']).toHaveBeenCalledWith(expect.objectContaining({ nit: '900123', urlPdfNit: 'https://cdn/nit.pdf' }));
      expect(c.mensajeExito).toContain('registrada con éxito');
      vi.advanceTimersByTime(2200);
      expect(navegar).toHaveBeenCalledWith(['/login']);
      vi.useRealTimers();
    });

    it('muestra el error del backend o uno por defecto', () => {
      const c = crear();
      llenar(c);
      c.urlPdfNitSubido = 'https://cdn/nit.pdf';
      empresa['registrarEmpresa'].mockReturnValue(throwError(() => ({ error: 'El NIT ya existe' })));
      c.onSubmit();
      expect(c.mensajeError).toBe('El NIT ya existe');

      empresa['registrarEmpresa'].mockReturnValue(throwError(() => ({ error: {} })));
      c.onSubmit();
      expect(c.mensajeError).toContain('Verifica que el NIT');
      expect(c.enviandoRegistro).toBe(false);
    });
  });
});
