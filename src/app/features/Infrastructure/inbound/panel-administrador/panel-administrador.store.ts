import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Admin,
  AlumnoEnPracticaView,
  CommentAdminDTO,
  Company,
  OfferAdminDTO,
  PracticeAdminDTO,
  StudentProfileDTO
} from '../../../../core/services/admin/admin';
import { PostulacionService, PostulationDetailResponse } from '../../../../core/services/postulacion/postulacion';
import { TIPOS_EMPRESA_CATALOGO } from '../../../../core/constants/catalogos-udec';
import { environment } from '../../../../../environments/environment';
import { normalizarCodigoTipoEmpresa, normalizarTextoSinTildes } from './panel-administrador.utils';

export type VistaAdmin = 'pendientes' | 'empresas' | 'estudiantes' | 'ofertas' | 'practicas' | 'comentarios';

/**
 * Estado compartido del panel de administración (una instancia por panel: se provee en PanelAdministrador).
 *
 * Con signals, las listas derivadas (empresas pendientes/aprobadas, alumnos en práctica) son
 * `computed` y se recalculan solas cuando llega cada respuesta HTTP; antes había que llamar a
 * reconstruirAlumnosEnPractica() y a detectChanges() a mano en cada callback.
 *
 * Los filtros y la paginación de cada tabla viven en el componente de su vista.
 */
@Injectable()
export class PanelAdminStore {
  private readonly adminService = inject(Admin);
  private readonly postulacionService = inject(PostulacionService);
  private readonly http = inject(HttpClient);

  // ---------------- Navegación, sesión y mensajes ----------------
  readonly vista = signal<VistaAdmin>('pendientes');
  readonly correoAdmin = signal('');
  readonly avatarAdminUrl = signal<string | null>(null);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');
  /** id (NIT, idOffer o idComment) del elemento que se está procesando, para deshabilitar sus botones. */
  readonly procesandoId = signal<string | number | null>(null);

  // ---------------- Datos ----------------
  readonly todasLasEmpresas = signal<Company[]>([]);
  readonly estudiantes = signal<any[]>([]);
  readonly ofertas = signal<OfferAdminDTO[]>([]);
  readonly practicasRaw = signal<PracticeAdminDTO[]>([]);
  readonly postulantesPorOferta = signal<Record<number, PostulationDetailResponse[]>>({});
  readonly comentariosPendientes = signal<CommentAdminDTO[]>([]);
  private readonly documentosPorPostulacion = signal<Record<number, any>>({});
  private readonly documentosPorCedula = signal<Record<string, any>>({});

  readonly empresasPendientes = computed(() =>
    this.todasLasEmpresas().filter(e => (e.verificationStatus || 'PENDIENTE').toUpperCase() === 'PENDIENTE')
  );
  readonly empresasAprobadas = computed(() =>
    this.todasLasEmpresas().filter(e => (e.verificationStatus || '').toUpperCase() === 'APROBADA')
  );
  readonly alumnosEnPractica = computed(() => this.construirAlumnosEnPractica());

  // ---------------- Modales (se abren desde varias vistas) ----------------
  readonly empresaModal = signal<Company | null>(null);
  readonly estudianteModal = signal<any | null>(null);
  readonly perfilEstudianteModal = signal<StudentProfileDTO | null>(null);
  readonly cargandoPerfilEstudiante = signal(false);
  readonly practicaModal = signal<AlumnoEnPracticaView | null>(null);
  readonly ofertaHistorialModal = signal<OfferAdminDTO | null>(null);
  readonly seleccionadosOfertaModal = computed(() => {
    const of = this.ofertaHistorialModal();
    return of ? this.aceptadosPorOferta(of.idOffer) : [];
  });

  // =====================================================================
  // Sesión y navegación
  // =====================================================================

  /** @returns false si no hay sesión válida de administrador. */
  inicializarSesion(): boolean {
    const sesionStr = localStorage.getItem('usuario_sesion');
    const token = localStorage.getItem('token') || '';
    const jwtData = token ? this.decodificarJwt(token) : null;

    let correo = '';
    if (sesionStr) {
      try {
        const sesion = JSON.parse(sesionStr);
        correo = sesion.email || sesion.correoElectronico || jwtData?.sub || jwtData?.email || '';
      } catch {
        correo = jwtData?.sub || '';
      }
    } else if (jwtData) {
      correo = jwtData.sub || jwtData.email || '';
    }

    if (!correo) return false;
    this.correoAdmin.set(correo);
    this.avatarAdminUrl.set(localStorage.getItem(`avatar_admin_${correo}`));
    return true;
  }

  cambiarVista(vista: VistaAdmin): void {
    this.vista.set(vista);
    this.limpiarMensajes();
    if (vista === 'practicas') {
      this.cargarDocumentosContratos();
    }
  }

  limpiarMensajes(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');
  }

  // =====================================================================
  // Carga de datos
  // =====================================================================

  cargarTodo(): void {
    this.cargarEmpresas();
    this.cargarEstudiantes();
    this.cargarOfertasYPracticas();
    this.cargarComentariosPendientes();
    this.cargarDocumentosContratos();
  }

  cargarEmpresas(): void {
    this.adminService.obtenerTodasLasEmpresas().subscribe({
      next: (todas) => this.todasLasEmpresas.set(todas || []),
      error: () => this.todasLasEmpresas.set([])
    });
  }

  cargarEstudiantes(): void {
    this.adminService.obtenerEstudiantes().subscribe({
      next: (data) => this.estudiantes.set(data || []),
      error: () => this.estudiantes.set([])
    });
  }

  cargarOfertasYPracticas(): void {
    this.adminService.obtenerTodasLasOfertas().subscribe({
      next: (data) => {
        const ofertas = data || [];
        this.ofertas.set(ofertas);
        ofertas.forEach(of => {
          this.postulacionService.verPostuladosPorOferta(of.idOffer).subscribe({
            next: (postulantes) => this.postulantesPorOferta.update(m => ({ ...m, [of.idOffer]: postulantes || [] })),
            error: () => this.postulantesPorOferta.update(m => ({ ...m, [of.idOffer]: [] }))
          });
        });
      },
      error: () => this.ofertas.set([])
    });

    this.adminService.obtenerTodasLasPracticas().subscribe({
      next: (practicas) => this.practicasRaw.set(practicas || []),
      error: () => this.practicasRaw.set([])
    });
  }

  cargarComentariosPendientes(): void {
    this.adminService.obtenerComentariosPendientes().subscribe({
      next: (data) => this.comentariosPendientes.set(data || []),
      error: () => this.comentariosPendientes.set([])
    });
  }

  cargarDocumentosContratos(): void {
    this.http.get<any[]>(`${environment.baseUrl}/documentos/todos`).subscribe({
      next: (docs) => {
        const porPostulacion: Record<number, any> = {};
        const porCedula: Record<string, any> = {};
        (docs || []).forEach((d) => {
          if (d.idPostulation) porPostulacion[Number(d.idPostulation)] = d;
          if (d.documentStudent) porCedula[String(d.documentStudent).trim()] = d;
        });
        this.documentosPorPostulacion.set(porPostulacion);
        this.documentosPorCedula.set(porCedula);
      },
      error: (err) => console.error('Error cargando documentos de práctica en Admin:', err)
    });
  }

  // =====================================================================
  // Acciones
  // =====================================================================

  verificarEmpresa(nit: string, aprobada: boolean): void {
    this.procesandoId.set(nit);
    this.limpiarMensajes();
    this.adminService.verificarEmpresa(nit, aprobada).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(null);
        this.mensajeExito.set(respuesta || (aprobada
          ? 'Empresa aprobada y habilitada en la plataforma.'
          : 'Empresa inhabilitada / rechazada exitosamente.'));
        this.empresaModal.set(null);
        this.cargarEmpresas();
      },
      error: (err) => {
        this.procesandoId.set(null);
        this.mensajeError.set(typeof err?.error === 'string' && err.error ? err.error : 'Error al procesar el estado de la empresa.');
      }
    });
  }

  cerrarOferta(oferta: OfferAdminDTO): void {
    this.procesandoId.set(oferta.idOffer);
    this.limpiarMensajes();
    this.adminService.cerrarOfertaPorAdmin(oferta.idOffer).subscribe({
      next: (msg) => {
        this.procesandoId.set(null);
        this.mensajeExito.set(msg || `La oferta "${oferta.practiceName}" fue cerrada y movida al historial.`);
        this.cargarOfertasYPracticas();
      },
      error: () => {
        this.procesandoId.set(null);
        this.mensajeError.set('No se pudo cerrar la oferta seleccionada.');
      }
    });
  }

  moderarComentario(comentario: CommentAdminDTO, aprobado: boolean): void {
    this.procesandoId.set(comentario.idComment);
    this.limpiarMensajes();
    this.adminService.moderarComentario(comentario.idComment, aprobado).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.mensajeExito.set(aprobado ? 'Comentario aprobado y publicado.' : 'Comentario rechazado por moderación.');
        this.cargarComentariosPendientes();
      },
      error: () => {
        this.procesandoId.set(null);
        this.mensajeError.set('Error al moderar el comentario.');
      }
    });
  }

  subirFotoAdmin(file: File): void {
    this.adminService.subirFotoAdminCloudinary(file).subscribe({
      next: (res) => {
        this.avatarAdminUrl.set(res.url);
        localStorage.setItem(`avatar_admin_${this.correoAdmin()}`, res.url);
        this.mensajeExito.set('Foto de perfil de administrador actualizada.');
      },
      error: () => this.mensajeError.set('No se pudo subir la foto de perfil.')
    });
  }

  // =====================================================================
  // Modales
  // =====================================================================

  abrirPerfilEstudiante(est: any): void {
    this.estudianteModal.set(est);
    this.perfilEstudianteModal.set(null);
    this.cargandoPerfilEstudiante.set(true);
    const doc = est.document || est.documento || est.documentNumber;
    this.adminService.obtenerPerfilEstudiante(doc).subscribe({
      next: (perfil) => {
        this.perfilEstudianteModal.set(perfil || null);
        this.cargandoPerfilEstudiante.set(false);
      },
      error: () => {
        this.perfilEstudianteModal.set(null);
        this.cargandoPerfilEstudiante.set(false);
      }
    });
  }

  /** Abre el perfil a partir de datos parciales (desde una práctica o el historial de ofertas). */
  abrirPerfilEstudiantePorDocumento(documento?: string, nombreCompleto?: string, programa?: string): void {
    const encontrado = this.estudiantes().find(e => {
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
    this.abrirPerfilEstudiante(encontrado);
  }

  cerrarPerfilEstudiante(): void {
    this.estudianteModal.set(null);
    this.perfilEstudianteModal.set(null);
  }

  // =====================================================================
  // Consultas sobre los datos cargados
  // =====================================================================

  etiquetaTipoEmpresa(tipo?: string): string {
    const codigo = normalizarCodigoTipoEmpresa(tipo);
    const encontrado = TIPOS_EMPRESA_CATALOGO.find(t => t.valor === codigo);
    return encontrado ? encontrado.etiqueta : (tipo || 'S.A.S.');
  }

  nombreEmpresaPorNit(nit?: string): string {
    if (!nit) return 'Empresa Aliada';
    const emp = this.todasLasEmpresas().find(e => e.nit === nit);
    return emp ? emp.companyName : `Empresa (NIT: ${nit})`;
  }

  correoEmpresa(emp: Company): string {
    if (emp.email || emp.correo) return emp.email || emp.correo || '';
    const slug = (emp.companyName || 'empresa').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `contacto@${slug}.com.co`;
  }

  /** Misma regla que el backend (Company.hasCertificadoNit): solo se aprueba con el PDF del NIT guardado en BD. */
  tieneCertificadoNit(emp: Company): boolean {
    const url = (emp.rutPdfUrl || emp.urlPdfNit || '').trim().toLowerCase();
    return url.startsWith('https://') && url.endsWith('.pdf');
  }

  urlPdfNit(emp: Company): string | null {
    return emp.rutPdfUrl || emp.urlPdfNit || localStorage.getItem(`pdf_${emp.nit}`) || null;
  }

  correoEstudiante(est: any): string {
    if (!est) return '';
    if (est.email || est.correo || est.studentEmail || est.emailAddres) {
      return est.email || est.correo || est.studentEmail || est.emailAddres;
    }
    const doc = est.document || est.documento || '';
    for (const postulantes of Object.values(this.postulantesPorOferta())) {
      const post = (postulantes || []).find(p => (p.studentDocument || p.documentStudent) === doc);
      if (post?.studentEmail) return post.studentEmail;
    }
    const nom = normalizarTextoSinTildes(est.name || est.nombres || 'estudiante').split(' ')[0];
    const ape = normalizarTextoSinTildes(est.lastName || est.apellidos || 'udec').split(' ')[0];
    return `${nom}.${ape}@ucundinamarca.edu.co`;
  }

  aceptadosPorOferta(idOffer: number): PostulationDetailResponse[] {
    return (this.postulantesPorOferta()[idOffer] || [])
      .filter(p => String(p.statusPostulation || '').toUpperCase() === 'ACEPTADA');
  }

  cuposIniciales(of: OfferAdminDTO): number {
    const iniciales = (of.availableSpots || 0) + this.aceptadosPorOferta(of.idOffer).length;
    return iniciales > 0 ? iniciales : 1;
  }

  documentoDePractica(practica: any): any | null {
    if (!practica) return null;
    const porPostulacion = this.documentosPorPostulacion();
    if (practica.idPostulation && porPostulacion[Number(practica.idPostulation)]) {
      return porPostulacion[Number(practica.idPostulation)];
    }
    const cc = String(practica.studentDocument || practica.documentStudent || '').trim();
    return cc ? (this.documentosPorCedula()[cc] || null) : null;
  }

  documentoPorNombre(nombreCompleto?: string): string {
    if (!nombreCompleto) return 'Registrado';
    const est = this.estudiantes().find(e => {
      const nom = `${e.name || e.nombres || ''} ${e.lastName || e.apellidos || ''}`.trim().toLowerCase();
      return nom === nombreCompleto.trim().toLowerCase();
    });
    return est ? (est.document || est.documento) : 'Registrado';
  }

  private nombreEstudiantePorDoc(documento?: string): string {
    if (!documento) return 'Estudiante UdeC';
    const est = this.estudiantes().find(e => (e.document || e.documento) === documento);
    if (!est) return documento;
    return `${est.name || est.nombres || ''} ${est.lastName || est.apellidos || ''}`.trim();
  }

  private construirAlumnosEnPractica(): AlumnoEnPracticaView[] {
    const practicas = this.practicasRaw();
    const lista: AlumnoEnPracticaView[] = [];

    this.ofertas().forEach(of => {
      this.aceptadosPorOferta(of.idOffer).forEach(post => {
        const practicaBD: any = practicas.find(
          (pr: any) => Number(pr.idPostulation || pr.id_postulacion) === Number(post.idPostulation)
        );
        const doc = post.studentDocument || post.documentStudent || this.documentoPorNombre(post.studentFullName);

        lista.push({
          idPractice: practicaBD?.idPractice || practicaBD?.id_practica || post.idPostulation,
          idPostulation: post.idPostulation,
          studentDocument: doc,
          studentFullName: post.studentFullName || this.nombreEstudiantePorDoc(doc),
          studentProgram: post.studentAcademicProgram || post.academicProgram || of.profession,
          offerId: of.idOffer,
          offerName: of.practiceName,
          offerDescription: of.practiceDescription || 'Sin descripción adicional.',
          modality: of.modality || 'Presencial',
          location: of.location || 'Fusagasugá, Cundinamarca',
          salary: of.salary ?? 0,
          nitCompany: of.nitCompanyAssociated,
          companyName: this.nombreEmpresaPorNit(of.nitCompanyAssociated),
          startDate: practicaBD?.startDate || practicaBD?.fecha_inicio || of.PublicationDate || of.publicationDate || '2026-11-01',
          endDate: practicaBD?.endDate || practicaBD?.fecha_fin || of.closingDate || '2027-05-01',
          closingDate: of.closingDate || 'Segun convenio',
          statusPractice: practicaBD?.statusPractice || practicaBD?.estado_practica || 'EN_CURSO'
        });
      });
    });

    return lista;
  }

  private decodificarJwt(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }
}
