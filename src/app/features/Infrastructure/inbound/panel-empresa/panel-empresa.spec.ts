import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PanelEmpresa } from './panel-empresa';
import { PanelEmpresaStore } from './panel-empresa.store';
import { EmpresaMisOfertas } from './components/empresa-mis-ofertas/empresa-mis-ofertas';
import { EmpresaCrearOferta } from './components/empresa-crear-oferta/empresa-crear-oferta';
import { Empresa } from '../../../../core/services/empresa/empresa';
import { OfertaService, OfferRequestDTO } from '../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { HttpClient } from '@angular/common/http';

describe('PanelEmpresa (shell + store + vistas)', () => {
  let fixture: ComponentFixture<PanelEmpresa>;
  let store: PanelEmpresaStore;

  const ofertas: OfferRequestDTO[] = [
    { idOffer: 1, practiceName: 'Desarrollador Angular', nitCompanyAssociated: '900-1', practiceDescription: 'Front',
      profession: 'Ingeniería de Sistemas', salary: 1300000, modality: 'Remoto', location: 'Fusagasugá', availableSpots: 2, closingDate: '2026-12-31' },
    { idOffer: 2, practiceName: 'Auxiliar Contable', nitCompanyAssociated: '900-1', practiceDescription: 'Contabilidad',
      profession: 'Contaduría Pública', salary: 1000000, modality: 'Presencial', location: 'Fusagasugá', availableSpots: 1, closingDate: '2026-12-31' },
    { idOffer: 3, practiceName: 'De otra empresa', nitCompanyAssociated: '800-9', practiceDescription: 'x',
      profession: 'Música', salary: 0, modality: 'Remoto', location: 'Chía', availableSpots: 1, closingDate: '2026-12-31' }
  ];

  const crearOferta = vi.fn(() => of({}));

  beforeEach(async () => {
    const ls: Record<string, string> = {
      usuario_sesion: JSON.stringify({ idUser: 7, email: 'contacto@acme.co', userRol: 'empresa' }),
      token: 'h.e30.s'
    };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => ls[k] ?? null,
      setItem: (k: string, v: string) => { ls[k] = v; },
      removeItem: (k: string) => { delete ls[k]; },
      clear: () => {}
    });
    crearOferta.mockClear();

    // HttpClient falso: /admin/ofertas devuelve todas las ofertas; el resto, listas vacías
    const httpMock = {
      get: (url: string) => of(url.endsWith('/admin/ofertas') ? ofertas : []),
      post: () => of({})
    };

    await TestBed.configureTestingModule({
      imports: [PanelEmpresa],
      providers: [
        provideRouter([]),
        { provide: HttpClient, useValue: httpMock },
        { provide: Empresa, useValue: { obtenerTodasLasEmpresas: () => of([
          { idUser: 7, nit: '900-1', companyName: 'ACME SAS', legalRepresentative: { nameRepresentative: 'Ana' } }
        ]) } },
        { provide: OfertaService, useValue: { crearOferta, listarOfertasActivas: () => of([]) } },
        { provide: PostulacionService, useValue: { verPostuladosPorOferta: () => of([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PanelEmpresa);
    fixture.detectChanges();
    store = fixture.debugElement.injector.get(PanelEmpresaStore);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('identifica la empresa de la sesión y carga solo sus ofertas (filtradas por NIT)', () => {
    expect(store.nombreEmpresa()).toBe('ACME SAS');
    expect(store.nitEmpresa()).toBe('900-1');
    expect(store.misOfertas().map(o => o.idOffer)).toEqual([1, 2]);
    expect(store.totalCuposDisponibles()).toBe(3);
  });

  it('el shell muestra una sola vista y navega entre ellas', () => {
    expect(fixture.nativeElement.querySelector('app-empresa-inicio')).toBeTruthy();
    store.cambiarVista('perfil');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empresa-inicio')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-empresa-perfil')).toBeTruthy();
  });

  it('vista Mis Ofertas: el buscador filtra por cargo, programa o modalidad', () => {
    store.cambiarVista('mis-ofertas');
    fixture.detectChanges();
    const vista = fixture.debugElement.query(By.directive(EmpresaMisOfertas)).componentInstance as EmpresaMisOfertas;
    expect(vista.ofertasFiltradas().length).toBe(2);
    vista.filtro.set('contadur');
    expect(vista.ofertasFiltradas().map(o => o.idOffer)).toEqual([2]);
  });

  it('vista Nueva Oferta: no publica un formulario inválido y avisa en la alerta global', () => {
    store.cambiarVista('crear-oferta');
    fixture.detectChanges();
    const vista = fixture.debugElement.query(By.directive(EmpresaCrearOferta)).componentInstance as EmpresaCrearOferta;
    vista.publicarOferta();
    expect(crearOferta).not.toHaveBeenCalled();
    expect(store.mensajeError()).toContain('completa todos los campos');
  });

  it('vista Nueva Oferta: publica con el NIT de la empresa', () => {
    store.cambiarVista('crear-oferta');
    fixture.detectChanges();
    const vista = fixture.debugElement.query(By.directive(EmpresaCrearOferta)).componentInstance as EmpresaCrearOferta;
    vista.ofertaForm.patchValue({
      practiceName: 'Practicante QA', profession: 'Ingeniería de Sistemas', closingDate: '2026-12-31',
      practiceDescription: 'Pruebas automatizadas con Playwright'
    });
    vista.publicarOferta();
    expect(crearOferta).toHaveBeenCalledWith(expect.objectContaining({ practiceName: 'Practicante QA', nitCompanyAssociated: '900-1' }));
    expect(store.mensajeExito()).toContain('publicada');
  });
});
