import { Component, OnInit,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OfertaService, OfferRequestDTO } from '../../../../core/services/oferta/ofertas';
import { PostulacionService, PostulationDetailResponse } from '../../../../core/services/postulacion/postulacion';
import { Empresa } from '../../../../core/services/empresa/empresa';

@Component({
  selector: 'app-panel-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './panel-empresa.html',
  styleUrl: './panel-empresa.scss'
})
export class PanelEmpresa implements OnInit {
  vistaActual: 'inicio' | 'crear-oferta' | 'mis-ofertas' | 'postulantes' | 'perfil' = 'inicio';
  menuPerfilAbierto = false;

  // Datos de la sesión actual
  idUsuarioSesion: number | null = null;
  nombreEmpresa = 'Cargando empresa...';
  nitEmpresa = '';
  correoEmpresa = '';

  // Perfil Corporativo
  perfilForm: FormGroup;
  logoPreviewUrl: string | null = null;
  archivoLogoSeleccionado: File | null = null;
  archivoPdfNitSeleccionado: File | null = null;
  nombreArchivoPdfNit = '';

  // Ofertas y Postulaciones
  misOfertas: OfferRequestDTO[] = [];
  filtroTextoOferta = '';
  postulantesOfertaSeleccionada: PostulationDetailResponse[] = [];
  ofertaSeleccionada: OfferRequestDTO | null = null;
  observacionesPorPostulante: { [idPostulation: number]: string } = {};

  cargando = false;
  mensajeExito = '';
  mensajeError = '';

  ofertaForm: FormGroup;

  programasUdec: string[] = [
    'Administración de Empresas',
    'Contaduría Pública',
    'Enfermería',
    'Ingeniería Agronómica',
    'Ingeniería Ambiental',
    'Ingeniería de Sistemas',
    'Ingeniería de Sistemas y Computación',
    'Ingeniería de Software',
    'Ingeniería Electrónica',
    'Ingeniería Industrial',
    'Ingeniería Mecatrónica',
    'Ingeniería Topográfica y Geomática',
    'Licenciatura en Ciencias Sociales',
    'Licenciatura en Educación Física',
    'Medicina Veterinaria y Zootecnia',
    'Música',
    'Profesional en Ciencias del Deporte',
    'Zootecnia'
  ];

  modalidades: string[] = ['Presencial', 'Remoto', 'Híbrido'];

  constructor(
    private fb: FormBuilder,
    private ofertaService: OfertaService,
    private postulacionService: PostulacionService,
    private empresaService: Empresa,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.ofertaForm = this.fb.group({
      practiceName: ['', [Validators.required, Validators.minLength(5)]],
      profession: ['', [Validators.required]],
      modality: ['Presencial', [Validators.required]],
      salary: [0, [Validators.required, Validators.min(0)]],
      location: ['Fusagasugá, Cundinamarca', [Validators.required]],
      availableSpots: [1, [Validators.required, Validators.min(1)]],
      closingDate: ['', [Validators.required]],
      practiceDescription: ['', [Validators.required, Validators.minLength(15)]]
    });

    this.perfilForm = this.fb.group({
      companyName: ['', Validators.required],
      businessName: [''],
      nit: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
      companyType: ['Privada'],
      phone: [''],
      department: ['Cundinamarca'],
      city: ['Fusagasugá'],
      address: [''],
      legalRepName: [''],
      legalRepLastName: [''],
      companyDescription: [
        'Somos una organización aliada de la Universidad de Cundinamarca comprometida con la formación profesional y tecnológica de practicantes universitarios.',
        [Validators.required, Validators.minLength(20)]
      ]
    });
  }

  ngOnInit(): void {
    this.inicializarPanelEmpresa();
  }

  // Decodifica el payload del JWT para extraer idUser o email si no vienen sueltos en usuario_sesion
  private decodificarJwt(token: string): any {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  }

  inicializarPanelEmpresa(): void {
    const sesionStr = localStorage.getItem('usuario_sesion');
    const token = localStorage.getItem('token') || '';
    const jwtData = token ? this.decodificarJwt(token) : null;

    if (sesionStr) {
      try {
        const sesion = JSON.parse(sesionStr);

        // 1. Extraemos correo, idUser y NIT EXCLUSIVAMENTE de la sesión actual (no de llaves viejas)
        this.correoEmpresa = sesion.email || sesion.correoElectronico || jwtData?.sub || jwtData?.email || '';
        this.idUsuarioSesion = sesion.idUser || sesion.idUsuario || sesion.id || jwtData?.idUser || jwtData?.id || null;
        this.nitEmpresa = sesion.nit || sesion.nitCompany || jwtData?.nit || '';

        // 2. Nombre provisional basado en la cuenta actual mientras responde la BD
        if (sesion.companyName || sesion.nombreEmpresa) {
          this.nombreEmpresa = sesion.companyName || sesion.nombreEmpresa;
        } else if (this.correoEmpresa.includes('@')) {
          const base = this.correoEmpresa.split('@')[0].replace(/[._-]/g, ' ');
          this.nombreEmpresa = base.replace(/\b\w/g, l => l.toUpperCase());
        }

        // Cargamos logo y PDF guardados específicamente para este correo
        this.logoPreviewUrl = localStorage.getItem(`logo_${this.correoEmpresa}`);
        this.nombreArchivoPdfNit = localStorage.getItem(`pdf_${this.correoEmpresa}`) || '';

      } catch (e) {
        console.error('Error al leer usuario_sesion', e);
      }
    }

    // 3. Primero sincronizamos los datos de la empresa en BD y LUEGO cargamos sus ofertas
    this.sincronizarDatosCorporativosBD();
  }

  sincronizarDatosCorporativosBD(): void {
    this.cargando = true;
    this.empresaService.obtenerTodasLasEmpresas().subscribe({
      next: (empresas) => {
        if (empresas && empresas.length > 0) {
          // Buscamos la empresa que coincida exactamente con la sesión actual
          const encontrada = empresas.find(emp => {
            const matchId = this.idUsuarioSesion && Number(emp.idUser) === Number(this.idUsuarioSesion);
            const matchNit = this.nitEmpresa && emp.nit === this.nitEmpresa;
            const matchCorreo = this.correoEmpresa &&
              (emp.email?.toLowerCase() === this.correoEmpresa.toLowerCase() ||
               emp.correoElectronico?.toLowerCase() === this.correoEmpresa.toLowerCase());
            return matchId || matchNit || matchCorreo;
          });

          if (encontrada) {
            this.nombreEmpresa = encontrada.companyName || this.nombreEmpresa;
            this.nitEmpresa = encontrada.nit || this.nitEmpresa;

            const descGuardada = localStorage.getItem(`desc_${this.nitEmpresa}`);

            this.perfilForm.patchValue({
              companyName: encontrada.companyName || this.nombreEmpresa,
              businessName: encontrada.businessName || encontrada.companyName || '',
              nit: this.nitEmpresa,
              email: this.correoEmpresa,
              companyType: encontrada.companyType || 'Privada',
              phone: encontrada.companyPhone || encontrada.phone || '',
              department: encontrada.department || 'Cundinamarca',
              city: encontrada.city || 'Fusagasugá',
              address: encontrada.companyAddress || encontrada.address || '',
              legalRepName: encontrada.nameLegalRepresentative || '',
              legalRepLastName: encontrada.lastNameLegalRepresentative || '',
              ...(descGuardada ? { companyDescription: descGuardada } : {})
            });
          } else {
            this.rellenarPerfilDesdeSesionActual();
          }
        } else {
          this.rellenarPerfilDesdeSesionActual();
        }

        // Una vez tenemos el NIT correcto de la empresa actual, cargamos sus ofertas inmediatamente
        this.cargarMisOfertas();
      },
      error: () => {
        this.rellenarPerfilDesdeSesionActual();
        this.cargarMisOfertas();
      }
    });
  }

  rellenarPerfilDesdeSesionActual(): void {
    this.perfilForm.patchValue({
      companyName: this.nombreEmpresa,
      nit: this.nitEmpresa,
      email: this.correoEmpresa
    });
  }

  cargarMisOfertas(): void {
    this.cargando = true;
    this.ofertaService.listarOfertasActivas().subscribe({
      next: (ofertas) => {
        const lista = ofertas || [];
        this.misOfertas = this.nitEmpresa
          ? lista.filter(o => o.nitCompanyAssociated === this.nitEmpresa)
          : lista;
        this.cargando = false;
        // Forzamos la actualización inmediata en la pantalla de Inicio sin tener que cambiar de pestaña
        this.cdr.detectChanges();
      },
      error: () => {
        this.misOfertas = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarVista(vista: 'inicio' | 'crear-oferta' | 'mis-ofertas' | 'postulantes' | 'perfil'): void {
    this.vistaActual = vista;
    this.menuPerfilAbierto = false;
    this.limpiarMensajes();
    if (vista === 'mis-ofertas' || vista === 'inicio') {
      this.cargarMisOfertas();
    }
  }

  get ofertasFiltradas(): OfferRequestDTO[] {
    if (!this.filtroTextoOferta.trim()) return this.misOfertas;
    const busq = this.filtroTextoOferta.toLowerCase();
    return this.misOfertas.filter(o =>
      o.practiceName?.toLowerCase().includes(busq) ||
      o.profession?.toLowerCase().includes(busq) ||
      o.modality?.toLowerCase().includes(busq)
    );
  }

  publicarOferta(): void {
    if (this.ofertaForm.invalid) {
      this.ofertaForm.markAllAsTouched();
      this.mensajeError = 'Por favor completa todos los campos obligatorios de la oferta.';
      return;
    }

    if (!this.nitEmpresa) {
      this.mensajeError = 'No se detectó el NIT de tu empresa en la sesión.';
      return;
    }

    this.cargando = true;
    this.limpiarMensajes();

    const payload: OfferRequestDTO = {
      ...this.ofertaForm.value,
      nitCompanyAssociated: this.nitEmpresa
    };

    this.ofertaService.crearOferta(payload).subscribe({
      next: () => {
        this.cargando = false;
        this.mensajeExito = '¡Oferta de práctica publicada exitosamente!';
        this.ofertaForm.reset({
          modality: 'Presencial',
          salary: 0,
          location: 'Fusagasugá, Cundinamarca',
          availableSpots: 1
        });
        this.cargarMisOfertas();
        setTimeout(() => this.cambiarVista('mis-ofertas'), 1200);
      },
      error: (err: any) => {
        this.cargando = false;
        this.mensajeError = err?.error || 'No se pudo publicar la oferta.';
        this.cdr.detectChanges();
      }
    });
  }

  verPostulantes(oferta: OfferRequestDTO): void {
    this.ofertaSeleccionada = oferta;
    this.vistaActual = 'postulantes';
    this.cargando = true;
    this.postulantesOfertaSeleccionada = [];
    this.limpiarMensajes();

    this.postulacionService.verPostuladosPorOferta(oferta.idOffer!).subscribe({
      next: (postulantes) => {
        this.postulantesOfertaSeleccionada = postulantes || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.postulantesOfertaSeleccionada = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  decidirPostulacion(postulante: PostulationDetailResponse, nuevoEstado: 'ACEPTADA' | 'RECHAZADA'): void {
    const observacion = this.observacionesPorPostulante[postulante.idPostulation] ||
      (nuevoEstado === 'ACEPTADA'
        ? 'Cumple con el perfil requerido para la práctica.'
        : 'Perfil no seleccionado en esta convocatoria.');

    this.cargando = true;
    this.limpiarMensajes();

    this.postulacionService.cambiarEstadoPostulacion(postulante.idPostulation, nuevoEstado, observacion).subscribe({
      next: () => {
        this.cargando = false;
        postulante.statusPostulation = nuevoEstado;
        this.mensajeExito = nuevoEstado === 'ACEPTADA'
          ? `¡Has ACEPTADO a ${postulante.studentFullName}! Se creó la práctica y se envió notificación por correo.`
          : `Se ha RECHAZADO la postulación de ${postulante.studentFullName}.`;

        if (nuevoEstado === 'ACEPTADA' && this.ofertaSeleccionada && this.ofertaSeleccionada.availableSpots > 0) {
          this.ofertaSeleccionada.availableSpots -= 1;
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.cargando = false;
        this.mensajeError = err?.error || 'Error al actualizar el estado de la postulación.';
        this.cdr.detectChanges();
      }
    });
  }

  onSeleccionarLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.mensajeError = 'Por favor selecciona una imagen válida (PNG, JPG o WEBP) para el logo.';
      return;
    }

    this.archivoLogoSeleccionado = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreviewUrl = reader.result as string;
      if (this.correoEmpresa) {
        localStorage.setItem(`logo_${this.correoEmpresa}`, this.logoPreviewUrl);
      }
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onSeleccionarPdfNit(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.mensajeError = 'El certificado RUT / Cámara de Comercio debe estar en formato PDF.';
      return;
    }

    this.archivoPdfNitSeleccionado = file;
    this.nombreArchivoPdfNit = file.name;
    if (this.correoEmpresa) {
      localStorage.setItem(`pdf_${this.correoEmpresa}`, file.name);
    }
  }

  guardarPerfilCorporativo(): void {
    if (this.perfilForm.invalid) {
      this.mensajeError = 'Por favor revisa que el nombre y la descripción de la empresa estén completos.';
      return;
    }

    const valores = this.perfilForm.getRawValue();
    this.nombreEmpresa = valores.companyName;
    if (this.nitEmpresa) {
      localStorage.setItem(`desc_${this.nitEmpresa}`, valores.companyDescription);
    }

    this.mensajeExito = '¡Perfil corporativo, descripción y documentos actualizados correctamente!';
  }

  get totalCuposDisponibles(): number {
    return this.misOfertas.reduce((acc, o) => acc + (o.availableSpots || 0), 0);
  }

  limpiarMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  cerrarSesion(): void {
    // Limpiamos llaves viejas para que nunca se crucen sesiones de distintas empresas
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_sesion');
    localStorage.removeItem('nitEmpresa');
    localStorage.removeItem('nombreEmpresaReal');
    this.router.navigate(['/login']);
  }
}