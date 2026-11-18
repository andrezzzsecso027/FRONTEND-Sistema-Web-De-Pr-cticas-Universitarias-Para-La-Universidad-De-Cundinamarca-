import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfertaService, OfferRequestDTO } from '../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { Empresa } from '../../../../core/services/empresa/empresa';
import { CandidatoRankeado, IaSeguridadService } from '../../../../core/services/ia-seguridad/ia-seguridad';
import { environment } from '../../../../../environments/environment';

export type VistaEmpresa = 'inicio' | 'crear-oferta' | 'mis-ofertas' | 'postulantes' | 'mis-practicas' | 'perfil';

export interface PracticaEmpresaView {
  idPostulation: number;
  idOffer: number;
  offerName: string;
  modality: string;
  salary: number;
  studentDocument: string;
  studentFullName: string;
  studentEmail: string;
  studentSkills: string;
  studentEnglishLevel: string;
  studentCvUrl: string | null;
  studentGithubUrl: string | null;
  photoUrl: string | null;
}

export interface RankingIaState {
  abierto: boolean;
  cargando: boolean;
  idOffer: number | null;
  nombreOferta: string;
  totalAnalizados: number;
  resultado: string;
  /** Ranking estructurado (cada candidato enlaza a su tarjeta en "Postulantes"). */
  ranking: CandidatoRankeado[];
  /** false si el backend usó el cálculo local porque la IA no respondió. */
  generadoPorIa: boolean;
  error: string;
}

const RANKING_INICIAL: RankingIaState = {
  abierto: false, cargando: false, idOffer: null, nombreOferta: '', totalAnalizados: 0, resultado: '',
  ranking: [], generadoPorIa: true, error: ''
};

const DESCRIPCION_POR_DEFECTO =
  'Somos una organización aliada de la Universidad de Cundinamarca comprometida con la formación profesional y tecnológica de practicantes universitarios.';

/**
 * Estado compartido del panel de empresa (una instancia por panel: se provee en PanelEmpresa).
 *
 * Usa signals: en esta app zoneless las vistas que leen un signal se actualizan solas,
 * sin llamar a ChangeDetectorRef.detectChanges() (que no está disponible en un servicio).
 *
 * Aquí vive solo lo que comparten varias vistas: identidad de la empresa, ofertas,
 * prácticas, contratos, navegación y mensajes. El estado propio de cada vista
 * (formularios, filtros, flags de envío) vive en su componente.
 */
@Injectable()
export class PanelEmpresaStore {
  private readonly http = inject(HttpClient);
  private readonly ofertaService = inject(OfertaService);
  private readonly postulacionService = inject(PostulacionService);
  private readonly empresaService = inject(Empresa);
  private readonly iaService = inject(IaSeguridadService);

  // ---------------- Navegación y mensajes ----------------
  readonly vista = signal<VistaEmpresa>('inicio');
  readonly cargando = signal(false);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');

  // ---------------- Identidad de la empresa ----------------
  readonly idUsuarioSesion = signal<number | null>(null);
  readonly nombreEmpresa = signal('Cargando empresa...');
  readonly nitEmpresa = signal('');
  readonly correoEmpresa = signal('');
  readonly ccRepresentanteLegal = signal('');
  readonly logoUrl = signal<string | null>(null);
  readonly pdfNitUrl = signal('');
  /** Registro completo de la empresa en BD (la vista de perfil rellena su formulario con él). */
  readonly empresaBD = signal<any | null>(null);

  // ---------------- Ofertas, prácticas y contratos ----------------
  readonly misOfertas = signal<OfferRequestDTO[]>([]);
  readonly misPracticas = signal<PracticaEmpresaView[]>([]);
  readonly ofertaSeleccionada = signal<OfferRequestDTO | null>(null);
  readonly contratosPorPostulacion = signal<Record<number, any>>({});
  /** Enlazados con [(ngModel)] en las vistas de postulantes y prácticas (se mutan directamente). */
  readonly comentariosContrato: Record<number, string> = {};
  readonly estadoSeguimientoContrato: Record<number, string> = {};

  readonly totalCuposDisponibles = computed(() =>
    this.misOfertas().reduce((acc, o) => acc + (o.availableSpots || 0), 0)
  );

  // ---------------- Ranking IA ----------------
  readonly rankingIa = signal<RankingIaState>(RANKING_INICIAL);

  /** Postulación a la que se debe desplazar y resaltar en "Postulantes" (al elegirla en el ranking). */
  readonly postulanteResaltadoId = signal<number | null>(null);

  // =====================================================================
  // Navegación
  // =====================================================================

  cambiarVista(vista: VistaEmpresa): void {
    this.vista.set(vista);
    this.limpiarMensajes();
    if (vista === 'mis-ofertas' || vista === 'inicio' || vista === 'mis-practicas') {
      this.cargarMisOfertasYPracticas();
      this.cargarContratosEmpresa();
    }
  }

  verPostulantes(oferta: OfferRequestDTO): void {
    this.ofertaSeleccionada.set(oferta);
    this.limpiarMensajes();
    this.vista.set('postulantes');
  }

  limpiarMensajes(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');
  }

  // =====================================================================
  // Carga inicial: identidad de la empresa
  // =====================================================================

  inicializar(): void {
    const sesionStr = localStorage.getItem('usuario_sesion');
    const token = localStorage.getItem('token') || '';
    const jwtData = token ? this.decodificarJwt(token) : null;

    if (sesionStr) {
      try {
        const sesion = JSON.parse(sesionStr);
        const correo = sesion.email || sesion.correoElectronico || jwtData?.sub || jwtData?.email || '';
        this.correoEmpresa.set(correo);
        this.idUsuarioSesion.set(sesion.idUser || sesion.idUsuario || sesion.id || jwtData?.idUser || jwtData?.id || null);
        this.nitEmpresa.set(sesion.nit || sesion.nitCompany || jwtData?.nit || '');

        if (sesion.companyName || sesion.nombreEmpresa) {
          this.nombreEmpresa.set(sesion.companyName || sesion.nombreEmpresa);
        } else if (correo.includes('@')) {
          const base = correo.split('@')[0].replace(/[._-]/g, ' ');
          this.nombreEmpresa.set(base.replace(/\b\w/g, (l: string) => l.toUpperCase()));
        }
      } catch (e) {
        console.error('Error al leer usuario_sesion', e);
      }
    }

    this.sincronizarDatosCorporativos();
  }

  private sincronizarDatosCorporativos(): void {
    this.cargando.set(true);
    this.empresaService.obtenerTodasLasEmpresas().subscribe({
      next: (empresas) => {
        const idUsuario = this.idUsuarioSesion();
        const nit = this.nitEmpresa();
        const correo = this.correoEmpresa();
        const encontrada = (empresas || []).find(emp => {
          const matchId = idUsuario && Number(emp.idUser) === Number(idUsuario);
          const matchNit = nit && emp.nit === nit;
          const matchNombre = !idUsuario && !nit &&
            emp.companyName?.toLowerCase().replace(/\s+/g, '') === correo.split('@')[0]?.toLowerCase();
          return matchId || matchNit || matchNombre;
        });

        if (encontrada) {
          this.nombreEmpresa.set(encontrada.companyName || this.nombreEmpresa());
          this.nitEmpresa.set(encontrada.nit || nit);
          const nitFinal = this.nitEmpresa();
          this.logoUrl.set(encontrada.logoUrl || localStorage.getItem(`logo_${nitFinal}`) || null);
          this.pdfNitUrl.set(encontrada.rutPdfUrl || localStorage.getItem(`pdf_${nitFinal}`) || '');
          this.ccRepresentanteLegal.set(encontrada.legalRepresentative?.numberDocument || '');
          this.empresaBD.set(encontrada);
        } else {
          this.empresaBD.set(null);
        }

        this.cargarMisOfertasYPracticas();
        this.cargarContratosEmpresa();
      },
      error: () => {
        this.cargarMisOfertasYPracticas();
        this.cargarContratosEmpresa();
      }
    });
  }

  /** Valores iniciales del formulario de perfil (desde BD o desde la sesión). */
  valoresPerfil(): Record<string, any> {
    const emp = this.empresaBD();
    if (!emp) {
      return { companyName: this.nombreEmpresa(), nit: this.nitEmpresa(), email: this.correoEmpresa() };
    }
    const rep = emp.legalRepresentative || {};
    const tipo = emp.companyType
      ? emp.companyType.charAt(0).toUpperCase() + emp.companyType.slice(1).toLowerCase()
      : 'Privada';
    return {
      companyName: emp.companyName || this.nombreEmpresa(),
      businessName: emp.legalName || emp.businessName || emp.companyName || '',
      nit: this.nitEmpresa(),
      email: this.correoEmpresa(),
      companyType: tipo,
      phone: emp.companyPhoneNumber || emp.companyPhone || '',
      department: emp.department || 'Cundinamarca',
      city: emp.city || 'Fusagasugá',
      address: emp.companyAddress || '',
      legalRepName: rep.nameRepresentative || '',
      legalRepLastName: rep.lastNameRepresentative || '',
      companyDescription: emp.companyDescription || DESCRIPCION_POR_DEFECTO
    };
  }

  // =====================================================================
  // Ofertas y prácticas
  // =====================================================================

  /** Carga TODAS las ofertas de la empresa y reconstruye "Mis Prácticas" con los estudiantes aceptados. */
  cargarMisOfertasYPracticas(): void {
    this.cargando.set(true);
    const filtrarPorNit = (lista: OfferRequestDTO[]) => {
      const nit = this.nitEmpresa();
      return nit ? lista.filter(o => o.nitCompanyAssociated === nit) : lista;
    };

    this.http.get<OfferRequestDTO[]>(`${environment.baseUrl}/admin/ofertas`).subscribe({
      next: (todas) => {
        this.misOfertas.set(filtrarPorNit(todas || []));
        this.cargando.set(false);
        this.reconstruirMisPracticas();
      },
      error: () => {
        // Respaldo: solo ofertas activas
        this.ofertaService.listarOfertasActivas().subscribe({
          next: (activas) => {
            this.misOfertas.set(filtrarPorNit(activas || []));
            this.cargando.set(false);
            this.reconstruirMisPracticas();
          },
          error: () => {
            this.misOfertas.set([]);
            this.cargando.set(false);
          }
        });
      }
    });
  }

  reconstruirMisPracticas(): void {
    const acumuladas: PracticaEmpresaView[] = [];
    this.misOfertas().forEach((oferta) => {
      if (!oferta.idOffer) return;
      this.postulacionService.verPostuladosPorOferta(oferta.idOffer).subscribe({
        next: (postulantes) => {
          const aceptados = (postulantes || []).filter(
            p => String(p.statusPostulation || '').toUpperCase() === 'ACEPTADA'
          );

          aceptados.forEach((post: any) => {
            if (!this.estadoSeguimientoContrato[post.idPostulation]) {
              this.estadoSeguimientoContrato[post.idPostulation] = 'EN_CURSO';
            }
            const item = this.crearPracticaView(oferta, post);
            this.completarConPerfil(item);

            if (!acumuladas.some(x => x.idPostulation === item.idPostulation)) {
              acumuladas.push(item);
              this.misPracticas.set([...acumuladas]);
            }
          });
        },
        error: () => {}
      });
    });
  }

  /** Arma la fila de "Mis practicantes" con los datos de la oferta y del postulante aceptado. */
  private crearPracticaView(oferta: OfferRequestDTO, post: any): PracticaEmpresaView {
    return {
      idPostulation: Number(post.idPostulation),
      idOffer: Number(oferta.idOffer),
      offerName: oferta.practiceName,
      modality: oferta.modality,
      salary: oferta.salary,
      studentDocument: String(post.documentStudent || post.studentDocument || ''),
      studentFullName: post.studentFullName || 'Estudiante UdeC',
      studentEmail: post.studentEmail || '',
      studentSkills: post.skills || 'Por registrar',
      studentEnglishLevel: post.englishLevel || 'B1',
      studentCvUrl: post.lifesheet || post.linkLifesheet || null,
      studentGithubUrl: post.githubUrl || null,
      photoUrl: post.photoUrl || null
    };
  }

  /** Completa la fila con el perfil profesional del estudiante (foto, habilidades, CV...). */
  private completarConPerfil(item: PracticaEmpresaView): void {
    if (!item.studentDocument) return;
    this.http.get<any>(`${environment.baseUrl}/registro/estudiantes/perfil/${item.studentDocument}`).subscribe({
      next: (perfil) => {
        if (!perfil) return;
        item.photoUrl = perfil.photoUrl || item.photoUrl;
        item.studentSkills = perfil.skills || item.studentSkills;
        item.studentEnglishLevel = perfil.englishLevel || item.studentEnglishLevel;
        item.studentGithubUrl = perfil.githubUrl || item.studentGithubUrl;
        item.studentCvUrl = perfil.linkLifesheet || item.studentCvUrl;
        this.misPracticas.update(lista => [...lista]); // notifica la mutación
      },
      error: () => {}
    });
  }

  /** Tras aceptar a un estudiante: descuenta el cupo localmente y prepara su seguimiento. */
  registrarAceptacion(idPostulation: number, observacion: string): void {
    const oferta = this.ofertaSeleccionada();
    if (oferta && oferta.availableSpots > 0) {
      oferta.availableSpots -= 1;              // el mismo objeto está en misOfertas
      this.ofertaSeleccionada.set({ ...oferta });
      this.misOfertas.update(lista => [...lista]);
    }
    this.estadoSeguimientoContrato[idPostulation] = 'EN_CURSO';
    this.comentariosContrato[idPostulation] = observacion;
    this.reconstruirMisPracticas();
  }

  // =====================================================================
  // Contratos de práctica
  // =====================================================================

  cargarContratosEmpresa(): void {
    const nit = this.nitEmpresa();
    if (!nit) return;
    this.http.get<any[]>(`${environment.baseUrl}/documentos/empresa/${nit}`).subscribe({
      next: (lista) => {
        const contratos: Record<number, any> = { ...this.contratosPorPostulacion() };
        (lista || []).forEach((doc) => {
          if (doc.idPostulation) {
            contratos[doc.idPostulation] = doc;
            this.comentariosContrato[doc.idPostulation] = doc.companyComments || '';
            this.estadoSeguimientoContrato[doc.idPostulation] = doc.trackingStatus || 'CONTRATO_FIRMADO';
          }
        });
        this.contratosPorPostulacion.set(contratos);
      },
      error: (err) => console.error('Error cargando contratos de la empresa:', err)
    });
  }

  registrarContrato(idPostulation: number, doc: any): void {
    this.contratosPorPostulacion.update(c => ({ ...c, [idPostulation]: doc }));
  }

  // =====================================================================
  // Ranking IA de candidatos
  // =====================================================================

  abrirRankingIa(oferta?: OfferRequestDTO | null): void {
    const target = oferta || this.ofertaSeleccionada();
    if (!target || !target.idOffer) return;

    this.rankingIa.set({ ...RANKING_INICIAL, abierto: true, cargando: true, idOffer: target.idOffer, nombreOferta: target.practiceName });

    this.iaService.obtenerRankingPostulados(target.idOffer).subscribe({
      next: (res) => this.rankingIa.update(s => ({
        ...s,
        cargando: false,
        nombreOferta: res.practiceName || target.practiceName,
        totalAnalizados: res.totalCandidatesAnalyzed,
        resultado: res.aiRankingAnalysis,
        ranking: res.ranking ?? [],
        generadoPorIa: res.aiPowered !== false
      })),
      error: () => this.rankingIa.update(s => ({
        ...s, cargando: false, error: 'No se pudo generar el ranking con IA para esta oferta.'
      }))
    });
  }

  cerrarRankingIa(): void {
    this.rankingIa.update(s => ({ ...s, abierto: false }));
  }

  /** Cierra el ranking y abre "Postulantes" de esa oferta con la tarjeta del candidato resaltada. */
  irAPostulante(idPostulation: number): void {
    const idOffer = this.rankingIa().idOffer;
    const oferta = this.misOfertas().find(o => o.idOffer === idOffer)
      ?? (this.ofertaSeleccionada()?.idOffer === idOffer ? this.ofertaSeleccionada() : null);
    this.cerrarRankingIa();
    if (oferta && (this.vista() !== 'postulantes' || this.ofertaSeleccionada()?.idOffer !== idOffer)) {
      this.verPostulantes(oferta);
    }
    this.postulanteResaltadoId.set(idPostulation);
  }

  // =====================================================================

  private decodificarJwt(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }
}
