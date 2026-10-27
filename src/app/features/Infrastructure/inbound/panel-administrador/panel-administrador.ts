import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Admin,
  Company,
  StudentProfileDTO,
  OfferAdminDTO,
  CommentAdminDTO,
  PracticeAdminDTO,
  AlumnoEnPracticaView
} from '../../../../core/services/admin/admin';

import { PostulacionService, PostulationDetailResponse } from '../../../../core/services/postulacion/postulacion';

type VistaAdmin =
  | 'pendientes'
  | 'empresas'
  | 'estudiantes'
  | 'ofertas'
  | 'practicas'
  | 'comentarios';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-panel-administrador',
  styleUrl: './panel-administrador.scss',
  templateUrl: './panel-administrador.html',
})
export class PanelAdministrador implements OnInit,OnDestroy {
vistaActual: VistaAdmin = 'pendientes';
  subVistaOfertas: 'actuales' | 'historial' = 'actuales';
  menuAdminAbierto = false;

  // Sesión del Administrador
  correoAdmin = '';
  idUsuarioAdmin: number | null = null;
  avatarAdminUrl: string | null = null;

  // Catálogo oficial de Tipos de Empresa (idéntico a registro-empresa)
  readonly tiposEmpresaCatalogo = [
    { valor: 'SAS', etiqueta: 'S.A.S. (Sociedad por Acciones Simplificada)' },
    { valor: 'LTDA', etiqueta: 'Sociedad Limitada (Ltda.)' },
    { valor: 'SA', etiqueta: 'Sociedad Anónima (S.A.)' },
    { valor: 'ESAL', etiqueta: 'Fundación / ONG (Sin Ánimo de Lucro)' },
    { valor: 'PUBLICA', etiqueta: 'Entidad del Estado / Pública' }
  ];

  // Catálogo oficial de Sedes y Programas UdeC (idéntico a registro-estudiante)
  readonly sedesCatalogo = [
    { valor: 'fusagasuga', etiqueta: 'Fusagasugá' },
    { valor: 'chia', etiqueta: 'Chía' },
    { valor: 'soacha', etiqueta: 'Soacha' },
    { valor: 'zipaquira', etiqueta: 'Zipaquirá' },
    { valor: 'girardot', etiqueta: 'Girardot' },
    { valor: 'ubate', etiqueta: 'Ubaté' }
  ];

  readonly programasPorSede: { [key: string]: string[] } = {
    fusagasuga: [
      'Ingeniería de Sistemas',
      'Ingeniería Electrónica',
      'Administración de Empresas',
      'Ingeniería Agronómica',
      'Zootecnia',
      'Contaduría Pública',
      'Licenciatura en Ciencias Sociales',
      'Licenciatura en Educación Física'
    ],
    chia: [
      'Ingeniería de Sistemas',
      'Contaduría Pública',
      'Ingeniería Industrial',
      'Ingeniería Mecatrónica'
    ],
    soacha: [
      'Administración de Empresas',
      'Contaduría Pública',
      'Profesional en Ciencias del Deporte',
      'Ingeniería Industrial',
      'Ingeniería de Software',
      'Ingeniería Topográfica y Geomática'
    ],
    zipaquira: ['Música'],
    girardot: [
      'Enfermería',
      'Administración de Empresas',
      'Ingeniería Ambiental',
      'Ingeniería de Software'
    ],
    ubate: [
      'Administración de Empresas',
      'Contaduría Pública',
      'Ingeniería de Sistemas y Computación',
      'Medicina Veterinaria y Zootecnia'
    ]
  };

  // Listados de datos
  todasLasEmpresas: Company[] = [];
  empresasPendientes: Company[] = [];
  empresasAprobadas: Company[] = [];
  estudiantes: any[] = [];
  ofertas: OfferAdminDTO[] = [];
  practicasRaw: PracticeAdminDTO[] = [];
  alumnosEnPractica: AlumnoEnPracticaView[] = [];
  comentariosPendientes: CommentAdminDTO[] = [];

  postulantesPorOferta: { [idOffer: number]: PostulationDetailResponse[] } = {};

  // Filtros y Paginación
  filtroEmpresaTexto = '';
  filtroEmpresaTipo = 'TODOS';
  filtroEmpresaCiudad = 'TODAS';
  paginaEmpresas = 1;
  readonly itemsPorPaginaEmpresas = 5;

  filtroEstudianteTexto = '';
  filtroEstudianteSede = 'TODAS';
  filtroEstudiantePrograma = 'TODOS';
  paginaEstudiantes = 1;
  readonly itemsPorPaginaEstudiantes = 6;

 readonly modalidadesCatalogo = ['Presencial', 'Remoto', 'Híbrido'];
  filtroOfertaModalidad = 'TODAS';
  filtroOfertaProfesion = 'TODAS';
  paginaOfertas = 1;
  readonly itemsPorPaginaOfertas = 5;

  // Modales de inspección
  empresaSeleccionadaModal: Company | null = null;
  estudianteSeleccionadoModal: any | null = null;
  perfilEstudianteModal: StudentProfileDTO | null = null;
  cargandoPerfilEstudiante = false;

  ofertaHistorialModal: OfferAdminDTO | null = null;
  seleccionadosOfertaModal: PostulationDetailResponse[] = [];
  practicaSeleccionadaModal: AlumnoEnPracticaView | null = null;

  procesandoId: string | number | null = null;
  mensajeExito = '';
  mensajeError = '';

  // Timeout de inactividad
  sesionExpiradaModal = false;
  private timeoutInactividad: any;
  private readonly TIEMPO_LIMITE_MS = 10 * 60 * 1000;

  constructor(
    private adminService: Admin,
    private postulacionService: PostulacionService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.inicializarSesionAdmin();
    this.cargarTodoElDashboard();
    this.reiniciarTemporizadorInactividad();
  }

  ngOnDestroy(): void {
    if (this.timeoutInactividad) {
      clearTimeout(this.timeoutInactividad);
    }
  }

  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:click')
  @HostListener('window:scroll')
  reiniciarTemporizadorInactividad(): void {
    if (this.sesionExpiradaModal) return;
    if (this.timeoutInactividad) clearTimeout(this.timeoutInactividad);
    this.timeoutInactividad = setTimeout(() => {
      this.sesionExpiradaModal = true;
      localStorage.removeItem('token');
      localStorage.removeItem('usuario_sesion');
      this.cdr.detectChanges();
      setTimeout(() => this.router.navigate(['/login']), 4000);
    }, this.TIEMPO_LIMITE_MS);
  }

  private decodificarJwt(token: string): any {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  }

  inicializarSesionAdmin(): void {
    const sesionStr = localStorage.getItem('usuario_sesion');
    const token = localStorage.getItem('token') || '';
    const jwtData = token ? this.decodificarJwt(token) : null;

    if (sesionStr) {
      try {
        const sesion = JSON.parse(sesionStr);
        this.correoAdmin = sesion.email || sesion.correoElectronico || jwtData?.sub || jwtData?.email || '';
        this.idUsuarioAdmin = sesion.idUser || sesion.idUsuario || jwtData?.idUser || null;
      } catch {
        this.correoAdmin = jwtData?.sub || '';
      }
    } else if (jwtData) {
      this.correoAdmin = jwtData.sub || jwtData.email || '';
    }

    if (!this.correoAdmin) {
      this.cerrarSesion();
      return;
    }

    this.avatarAdminUrl = localStorage.getItem(`avatar_admin_${this.correoAdmin}`);
  }

  cargarTodoElDashboard(): void {
    this.cargarEmpresas();
    this.cargarEstudiantes();
    this.cargarOfertasYPracticas();
    this.cargarComentariosPendientes();
  }

  cambiarVista(vista: VistaAdmin): void {
    this.vistaActual = vista;
    this.menuAdminAbierto = false;
    this.limpiarMensajes();
  }

  // --- EMPRESAS PENDIENTES Y APROBADAS ---
  cargarEmpresas(): void {
    this.adminService.obtenerTodasLasEmpresas().subscribe({
      next: (todas) => {
        const lista = todas || [];
        this.todasLasEmpresas = lista;
        this.empresasPendientes = lista.filter(
          e => (e.verificationStatus || 'PENDIENTE').toUpperCase() === 'PENDIENTE'
        );
        this.empresasAprobadas = lista.filter(
          e => (e.verificationStatus || '').toUpperCase() === 'APROBADA'
        );
        this.paginaEmpresas = 1;
        this.reconstruirAlumnosEnPractica();
        this.cdr.detectChanges();
      },
      error: () => {
        this.todasLasEmpresas = [];
        this.empresasPendientes = [];
        this.empresasAprobadas = [];
      }
    });
  }

  normalizarCodigoTipoEmpresa(tipo?: string): string {
    if (!tipo) return 'SAS';
    const limpio = tipo.toUpperCase().replace(/\./g, '').trim();
    if (limpio.includes('SAS')) return 'SAS';
    if (limpio.includes('LTDA') || limpio.includes('LIMITADA')) return 'LTDA';
    if (limpio === 'SA' || limpio.includes('ANONIMA')) return 'SA';
    if (limpio.includes('ESAL') || limpio.includes('FUNDACION') || limpio.includes('ONG')) return 'ESAL';
    if (limpio.includes('PUBLICA') || limpio.includes('ESTADO')) return 'PUBLICA';
    return tipo.toUpperCase().trim();
  }

  obtenerEtiquetaTipoEmpresa(tipo?: string): string {
    const codigo = this.normalizarCodigoTipoEmpresa(tipo);
    const encontrado = this.tiposEmpresaCatalogo.find(t => t.valor === codigo);
    return encontrado ? encontrado.etiqueta : (tipo || 'S.A.S.');
  }

  obtenerNombreEmpresaPorNit(nit?: string): string {
    if (!nit) return 'Empresa Aliada';
    const emp = this.todasLasEmpresas.find(e => e.nit === nit);
    return emp ? emp.companyName : `Empresa (NIT: ${nit})`;
  }

  obtenerCorreoEmpresa(emp: Company): string {
    if (emp.email || emp.correo) return emp.email || emp.correo || '';
    const slug = (emp.companyName || 'empresa').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `contacto@${slug}.com.co`;
  }

  obtenerUrlPdfNit(emp: Company): string | null {
    return emp.rutPdfUrl || emp.urlPdfNit || localStorage.getItem(`pdf_${emp.nit}`) || null;
  }

  aprobarEmpresa(nit: string): void {
    this.procesarVerificacionEmpresa(nit, true);
  }

  rechazarEmpresa(nit: string): void {
    this.procesarVerificacionEmpresa(nit, false);
  }

  private procesarVerificacionEmpresa(nit: string, aprobada: boolean): void {
    this.procesandoId = nit;
    this.limpiarMensajes();

    this.adminService.verificarEmpresa(nit, aprobada).subscribe({
      next: (respuesta) => {
        this.procesandoId = null;
        this.mensajeExito = respuesta || (aprobada
          ? 'Empresa aprobada y habilitada en la plataforma.'
          : 'Empresa inhabilitada / rechazada exitosamente.');
        this.empresaSeleccionadaModal = null;
        this.cargarEmpresas();
        this.cdr.detectChanges();
      },
      error: () => {
        this.procesandoId = null;
        this.mensajeError = 'Error al procesar el estado de la empresa.';
        this.cdr.detectChanges();
      }
    });
  }

  get ciudadesEmpresaDisponibles(): string[] {
    const ciudades = this.empresasAprobadas
      .map(e => (e.city || '').trim())
      .filter(Boolean);
    return Array.from(new Set(ciudades));
  }

  get empresasAprobadasFiltradas(): Company[] {
    return this.empresasAprobadas.filter(e => {
      const q = this.filtroEmpresaTexto.trim().toLowerCase();
      const matchTexto = !q ||
        e.companyName?.toLowerCase().includes(q) ||
        e.nit?.toLowerCase().includes(q) ||
        e.legalName?.toLowerCase().includes(q);

      const codigoTipo = this.normalizarCodigoTipoEmpresa(e.companyType);
      const matchTipo = this.filtroEmpresaTipo === 'TODOS' || codigoTipo === this.filtroEmpresaTipo;

      const matchCiudad = this.filtroEmpresaCiudad === 'TODAS' ||
        (e.city || '').toLowerCase() === this.filtroEmpresaCiudad.toLowerCase();

      return matchTexto && matchTipo && matchCiudad;
    });
  }

  get totalPaginasEmpresas(): number {
    return Math.max(1, Math.ceil(this.empresasAprobadasFiltradas.length / this.itemsPorPaginaEmpresas));
  }

  get empresasPaginadas(): Company[] {
    const inicio = (this.paginaEmpresas - 1) * this.itemsPorPaginaEmpresas;
    return this.empresasAprobadasFiltradas.slice(inicio, inicio + this.itemsPorPaginaEmpresas);
  }

  resetearPaginaEmpresas(): void {
    this.paginaEmpresas = 1;
  }

  abrirModalPerfilEmpresa(empresa: Company): void {
    this.empresaSeleccionadaModal = empresa;
  }

  cerrarModalEmpresa(): void {
    this.empresaSeleccionadaModal = null;
  }

  // --- ESTUDIANTES CON CATÁLOGO OFICIAL DE SEDES Y PROGRAMAS UDEC ---
  cargarEstudiantes(): void {
    this.adminService.obtenerEstudiantes().subscribe({
      next: (data) => {
        this.estudiantes = data || [];
        this.paginaEstudiantes = 1;
        this.reconstruirAlumnosEnPractica();
        this.cdr.detectChanges();
      },
      error: () => {
        this.estudiantes = [];
      }
    });
  }

  private normalizarTextoSinTildes(texto?: string): string {
    if (!texto) return '';
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/,/g, '')
      .toLowerCase()
      .trim();
  }

  get programasFiltroEstudianteDisponibles(): string[] {
    if (this.filtroEstudianteSede !== 'TODAS') {
      return this.programasPorSede[this.filtroEstudianteSede] || [];
    }
    const todos = Object.values(this.programasPorSede).reduce((acc, val) => acc.concat(val), []);
    return Array.from(new Set(todos));
  }

  onCambioSedeFiltroEstudiante(): void {
    this.filtroEstudiantePrograma = 'TODOS';
    this.paginaEstudiantes = 1;
  }

  private coincideProgramaAcademico(programaEstudiante: string, programaFiltro: string): boolean {
    const estNorm = this.normalizarTextoSinTildes(programaEstudiante);
    const filtroNorm = this.normalizarTextoSinTildes(programaFiltro);
    if (estNorm === filtroNorm) return true;
    // Manejo de variantes de escritura en registro-estudiante (ej. Agronimica, Zootecnica, Lic Sociales)
    if (filtroNorm.includes('agronomica') && estNorm.includes('agron')) return true;
    if (filtroNorm.includes('zootecnia') && estNorm.includes('zootec')) return true;
    if (filtroNorm.includes('industrial') && estNorm.includes('industrial')) return true;
    if (filtroNorm.includes('sociales') && estNorm.includes('sociales')) return true;
    if (filtroNorm.includes('educacion fisica') && estNorm.includes('fisica')) return true;
    return false;
  }

  get estudiantesFiltrados(): any[] {
    return this.estudiantes.filter(est => {
      const q = this.filtroEstudianteTexto.trim().toLowerCase();
      const doc = String(est.document || est.documento || '').toLowerCase();
      const nom = `${est.name || est.nombres || ''} ${est.lastName || est.apellidos || ''}`.toLowerCase();
      const sedeEst = this.normalizarTextoSinTildes(est.headquarters || est.sede || '');
      const progEst = est.academicProgram || est.programaAcademico || '';

      const matchTexto = !q || doc.includes(q) || nom.includes(q);
      const matchSede = this.filtroEstudianteSede === 'TODAS' ||
        sedeEst === this.normalizarTextoSinTildes(this.filtroEstudianteSede);
      const matchProg = this.filtroEstudiantePrograma === 'TODOS' ||
        this.coincideProgramaAcademico(progEst, this.filtroEstudiantePrograma);

      return matchTexto && matchSede && matchProg;
    });
  }

  get totalPaginasEstudiantes(): number {
    return Math.max(1, Math.ceil(this.estudiantesFiltrados.length / this.itemsPorPaginaEstudiantes));
  }

  get estudiantesPaginados(): any[] {
    const inicio = (this.paginaEstudiantes - 1) * this.itemsPorPaginaEstudiantes;
    return this.estudiantesFiltrados.slice(inicio, inicio + this.itemsPorPaginaEstudiantes);
  }

  resetearPaginaEstudiantes(): void {
    this.paginaEstudiantes = 1;
  }

  obtenerCorreoEstudiante(est: any): string {
    if (!est) return '';
    if (est.email || est.correo || est.studentEmail || est.emailAddres) {
      return est.email || est.correo || est.studentEmail || est.emailAddres;
    }
    const doc = est.document || est.documento || '';
    for (const idOferta of Object.keys(this.postulantesPorOferta)) {
      const post = (this.postulantesPorOferta[Number(idOferta)] || []).find(
        p => (p.studentDocument || p.documentStudent) === doc
      );
      if (post?.studentEmail) return post.studentEmail;
    }
    const nom = this.normalizarTextoSinTildes(est.name || est.nombres || 'estudiante').split(' ')[0];
    const ape = this.normalizarTextoSinTildes(est.lastName || est.apellidos || 'udec').split(' ')[0];
    return `${nom}.${ape}@ucundinamarca.edu.co`;
  }

  abrirModalPerfilEstudiante(est: any): void {
    this.estudianteSeleccionadoModal = est;
    this.perfilEstudianteModal = null;
    this.cargandoPerfilEstudiante = true;

    const doc = est.document || est.documento || est.documentNumber;
    this.adminService.obtenerPerfilEstudiante(doc).subscribe({
      next: (perfil) => {
        this.perfilEstudianteModal = perfil || null;
        this.cargandoPerfilEstudiante = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.perfilEstudianteModal = null;
        this.cargandoPerfilEstudiante = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirPerfilEstudiantePorDocumento(documento?: string, nombreCompleto?: string, programa?: string): void {
    const encontrado = this.estudiantes.find(e => {
      const docEst = e.document || e.documento;
      const nomEst = `${e.name || e.nombres || ''} ${e.lastName || e.apellidos || ''}`.trim().toLowerCase();
      return (documento && docEst === documento) || (nombreCompleto && nomEst === nombreCompleto.trim().toLowerCase());
    }) || {
      document: documento || 'No registrado',
      name: nombreCompleto || 'Estudiante UdeC',
      lastName: '',
      academicProgram: programa || 'Ingeniería de Sistemas',
      headquarters: 'Fusagasugá'
    };
    this.abrirModalPerfilEstudiante(encontrado);
  }

  cerrarModalEstudiante(): void {
    this.estudianteSeleccionadoModal = null;
    this.perfilEstudianteModal = null;
  }

  // --- OFERTAS Y PRÁCTICAS (CON FIX DE BOOLEAN EN STATUSOFFER) ---
  cargarOfertasYPracticas(): void {
    this.adminService.obtenerTodasLasOfertas().subscribe({
      next: (data) => {
        this.ofertas = data || [];
        this.ofertas.forEach(of => {
          this.postulacionService.verPostuladosPorOferta(of.idOffer).subscribe({
            next: (postulantes) => {
              this.postulantesPorOferta[of.idOffer] = postulantes || [];
              this.reconstruirAlumnosEnPractica();
              this.cdr.detectChanges();
            },
            error: () => {
              this.postulantesPorOferta[of.idOffer] = [];
            }
          });
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.ofertas = [];
      }
    });

    this.adminService.obtenerTodasLasPracticas().subscribe({
      next: (practicasBD) => {
        this.practicasRaw = practicasBD || [];
        this.reconstruirAlumnosEnPractica();
        this.cdr.detectChanges();
      },
      error: () => {
        this.practicasRaw = [];
        this.reconstruirAlumnosEnPractica();
      }
    });
  }

  // Solución definitiva al TypeError: raw.toUpperCase is not a function
  obtenerEstadoNormalizadoOferta(of: any): string {
    const raw = of?.statusOffer ?? of?.offerStatus ?? of?.estadoOferta;
    if (typeof raw === 'boolean') {
      return raw && (of?.availableSpots ?? 0) > 0 ? 'ACTIVA' : 'CERRADA';
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim().toUpperCase();
    }
    return (of?.availableSpots ?? 0) > 0 ? 'ACTIVA' : 'CERRADA';
  }

  get profesionesOfertaCatalogo(): string[] {
    const todos = Object.values(this.programasPorSede).reduce((acc, val) => acc.concat(val), []);
    return Array.from(new Set(todos)).sort();
  }

  cambiarSubVistaOfertas(subVista: 'actuales' | 'historial'): void {
    this.subVistaOfertas = subVista;
    this.paginaOfertas = 1;
  }

  resetearPaginaOfertas(): void {
    this.paginaOfertas = 1;
  }

  private cumpleFiltrosComboOferta(of: OfferAdminDTO): boolean {
    const modOferta = this.normalizarTextoSinTildes(of.modality || '');
    const modFiltro = this.normalizarTextoSinTildes(this.filtroOfertaModalidad);
    const matchModalidad = this.filtroOfertaModalidad === 'TODAS' || modOferta === modFiltro;

    const matchProfesion = this.filtroOfertaProfesion === 'TODAS' ||
      this.coincideProgramaAcademico(of.profession || '', this.filtroOfertaProfesion);

    return matchModalidad && matchProfesion;
  }

  get ofertasActualesFiltradas(): OfferAdminDTO[] {
    return this.ofertas.filter(of => {
      const estado = this.obtenerEstadoNormalizadoOferta(of);
      const esActual = of.availableSpots > 0 && estado !== 'CERRADA' && estado !== 'RECHAZADA';
      return esActual && this.cumpleFiltrosComboOferta(of);
    });
  }

  get ofertasHistorialFiltradas(): OfferAdminDTO[] {
    return this.ofertas.filter(of => {
      const estado = this.obtenerEstadoNormalizadoOferta(of);
      const esHistorial = of.availableSpots === 0 || estado === 'CERRADA' || estado === 'RECHAZADA' || estado === 'FINALIZADA';
      return esHistorial && this.cumpleFiltrosComboOferta(of);
    });
  }

  get listaOfertasActivaSegunPestana(): OfferAdminDTO[] {
    return this.subVistaOfertas === 'actuales'
      ? this.ofertasActualesFiltradas
      : this.ofertasHistorialFiltradas;
  }

  get totalPaginasOfertas(): number {
    return Math.max(1, Math.ceil(this.listaOfertasActivaSegunPestana.length / this.itemsPorPaginaOfertas));
  }

  get ofertasActualesPaginadas(): OfferAdminDTO[] {
    const inicio = (this.paginaOfertas - 1) * this.itemsPorPaginaOfertas;
    return this.ofertasActualesFiltradas.slice(inicio, inicio + this.itemsPorPaginaOfertas);
  }

  get ofertasHistorialPaginadas(): OfferAdminDTO[] {
    const inicio = (this.paginaOfertas - 1) * this.itemsPorPaginaOfertas;
    return this.ofertasHistorialFiltradas.slice(inicio, inicio + this.itemsPorPaginaOfertas);
  }

  obtenerEstudiantesAceptadosPorOferta(idOffer: number): PostulationDetailResponse[] {
    const postulantes = this.postulantesPorOferta[idOffer] || [];
    return postulantes.filter(p => String(p.statusPostulation || '').toUpperCase() === 'ACEPTADA');
  }

  calcularCuposIniciales(of: OfferAdminDTO): number {
    const aceptados = this.obtenerEstudiantesAceptadosPorOferta(of.idOffer).length;
    const iniciales = (of.availableSpots || 0) + aceptados;
    return iniciales > 0 ? iniciales : 1;
  }

  abrirModalSeleccionadosOferta(of: OfferAdminDTO): void {
    this.ofertaHistorialModal = of;
    this.seleccionadosOfertaModal = this.obtenerEstudiantesAceptadosPorOferta(of.idOffer);
  }

  cerrarModalSeleccionadosOferta(): void {
    this.ofertaHistorialModal = null;
    this.seleccionadosOfertaModal = [];
  }

  rechazarOCerrarOferta(oferta: OfferAdminDTO): void {
    this.procesandoId = oferta.idOffer;
    this.limpiarMensajes();

    this.adminService.cerrarOfertaPorAdmin(oferta.idOffer).subscribe({
      next: (msg) => {
        this.procesandoId = null;
        this.mensajeExito = msg || `La oferta "${oferta.practiceName}" fue cerrada y movida al historial.`;
        this.cargarOfertasYPracticas();
        this.cdr.detectChanges();
      },
      error: () => {
        this.procesandoId = null;
        this.mensajeError = 'No se pudo cerrar la oferta seleccionada.';
        this.cdr.detectChanges();
      }
    });
  }

  buscarDocumentoPorNombre(nombreCompleto?: string): string {
    if (!nombreCompleto) return 'Registrado';
    const est = this.estudiantes.find(e => {
      const nom = `${e.name || e.nombres || ''} ${e.lastName || e.apellidos || ''}`.trim().toLowerCase();
      return nom === nombreCompleto.trim().toLowerCase();
    });
    return est ? (est.document || est.documento) : 'Registrado';
  }

  reconstruirAlumnosEnPractica(): void {
    const lista: AlumnoEnPracticaView[] = [];

    this.ofertas.forEach(of => {
      const aceptados = this.obtenerEstudiantesAceptadosPorOferta(of.idOffer);
      aceptados.forEach(post => {
        const practicaBD: any = this.practicasRaw.find(
          (pr: any) => Number(pr.idPostulation || pr.id_postulacion) === Number(post.idPostulation)
        );

        const doc = post.studentDocument || post.documentStudent || this.buscarDocumentoPorNombre(post.studentFullName);

        lista.push({
          idPractice: practicaBD?.idPractice || practicaBD?.id_practica || post.idPostulation,
          idPostulation: post.idPostulation,
          studentDocument: doc,
          studentFullName: post.studentFullName || this.obtenerNombreEstudiantePorDoc(doc),
          studentProgram: post.studentAcademicProgram || post.academicProgram || of.profession,
          offerId: of.idOffer,
          offerName: of.practiceName,
          offerDescription: of.practiceDescription || 'Sin descripción adicional.',
          modality: of.modality || 'Presencial',
          location: of.location || 'Fusagasugá, Cundinamarca',
          salary: of.salary ?? 0,
          nitCompany: of.nitCompanyAssociated,
          companyName: this.obtenerNombreEmpresaPorNit(of.nitCompanyAssociated),
          startDate: practicaBD?.startDate || practicaBD?.fecha_inicio || of.PublicationDate || of.publicationDate || '2026-11-01',
          endDate: practicaBD?.endDate || practicaBD?.fecha_fin || of.closingDate || '2027-05-01',
          closingDate: of.closingDate || 'Segun convenio',
          statusPractice: practicaBD?.statusPractice || practicaBD?.estado_practica || 'EN_CURSO'
        });
      });
    });

    this.alumnosEnPractica = lista;
  }

  abrirModalDetallePractica(practica: AlumnoEnPracticaView): void {
    this.practicaSeleccionadaModal = practica;
  }

  cerrarModalDetallePractica(): void {
    this.practicaSeleccionadaModal = null;
  }

  obtenerNombreEstudiantePorDoc(documento?: string): string {
    if (!documento) return 'Estudiante UdeC';
    const est = this.estudiantes.find(e => (e.document || e.documento) === documento);
    if (!est) return documento;
    return `${est.name || est.nombres || ''} ${est.lastName || est.apellidos || ''}`.trim();
  }

  // --- MODERACIÓN DE COMENTARIOS ---
  cargarComentariosPendientes(): void {
    this.adminService.obtenerComentariosPendientes().subscribe({
      next: (data) => {
        this.comentariosPendientes = data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.comentariosPendientes = [];
      }
    });
  }

  moderarComentario(comentario: CommentAdminDTO, aprobado: boolean): void {
    this.procesandoId = comentario.idComment;
    this.limpiarMensajes();

    this.adminService.moderarComentario(comentario.idComment, aprobado).subscribe({
      next: () => {
        this.procesandoId = null;
        this.mensajeExito = aprobado
          ? 'Comentario aprobado y publicado.'
          : 'Comentario rechazado por moderación.';
        this.cargarComentariosPendientes();
        this.cdr.detectChanges();
      },
      error: () => {
        this.procesandoId = null;
        this.mensajeError = 'Error al moderar el comentario.';
        this.cdr.detectChanges();
      }
    });
  }

  onSeleccionarFotoAdmin(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    this.adminService.subirFotoAdminCloudinary(file).subscribe({
      next: (res) => {
        this.avatarAdminUrl = res.url;
        localStorage.setItem(`avatar_admin_${this.correoAdmin}`, res.url);
        this.mensajeExito = 'Foto de perfil de administrador actualizada.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajeError = 'No se pudo subir la foto de perfil.';
      }
    });
  }

  limpiarMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_sesion');
    this.router.navigate(['/login']);
  }
}
