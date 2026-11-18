import { Injectable, computed, inject, signal } from '@angular/core';
import { OfertaService, OfferRequestDTO } from '../../../../core/services/oferta/ofertas';
import { PostulacionService } from '../../../../core/services/postulacion/postulacion';
import { IaSeguridadService } from '../../../../core/services/ia-seguridad/ia-seguridad';
import { Auth } from '../../../../core/services/auth';
import {
  Estudiante,
  CalificacionEmpresa,
  EstudianteActual,
  MiPostulacion,
  MiPractica,
  PerfilProfesional
} from '../../../../core/services/estudiante/estudiante';

export interface RecomendacionIaState {
  abierto: boolean;
  cargando: boolean;
  totalAnalizadas: number;
  resultado: string;
  error: string;
}

/**
 * Estado compartido del portal del estudiante (una instancia por sesión del portal: se provee
 * en PanelEstudiante). Usa signals para que las vistas se actualicen solas (app zoneless).
 *
 * La identidad sale de GET /api/estudiantes/me (token JWT). Antes la cédula se buscaba
 * descargando la lista de todos los estudiantes y, si no aparecía, se postulaba con una
 * cédula fija de respaldo; ahora no se permite postular hasta conocer la cédula real.
 */
@Injectable()
export class PanelEstudianteStore {
  private readonly estudianteService = inject(Estudiante);
  private readonly ofertaService = inject(OfertaService);
  private readonly postulacionService = inject(PostulacionService);
  private readonly iaService = inject(IaSeguridadService);
  private readonly auth = inject(Auth);

  // ---------------- Identidad ----------------
  readonly estudiante = signal<EstudianteActual | null>(null);
  readonly correo = signal(this.auth.getUsuarioActual()?.email ?? '');
  readonly errorIdentidad = signal('');
  readonly documento = computed(() => this.estudiante()?.document ?? '');
  readonly nombreCompleto = computed(() => {
    const e = this.estudiante();
    return e ? `${e.name} ${e.lastName}`.trim() : 'Estudiante';
  });
  readonly iniciales = computed(() => {
    const e = this.estudiante();
    return e ? `${e.name?.charAt(0) ?? ''}${e.lastName?.charAt(0) ?? ''}`.toUpperCase() : 'E';
  });

  // ---------------- Datos ----------------
  readonly perfil = signal<PerfilProfesional | null>(null);
  readonly ofertas = signal<OfferRequestDTO[]>([]);
  readonly cargandoOfertas = signal(true);
  readonly postulaciones = signal<MiPostulacion[]>([]);
  readonly cargandoPostulaciones = signal(true);
  readonly procesandoOfertaId = signal<number | null>(null);
  readonly practicas = signal<MiPractica[]>([]);
  readonly cargandoPracticas = signal(true);
  readonly enviandoCalificacion = signal(false);

  /** La práctica en curso (si la hay) para destacarla en la barra lateral. */
  readonly practicaEnCurso = computed(() => this.practicas().find(p => p.practiceStatus === 'EN_CURSO') ?? null);

  /** Ofertas a las que ya se postuló (para deshabilitar el botón "Postularme"). */
  readonly ofertasPostuladas = computed(() => new Set(this.postulaciones().map(p => p.idOffer)));

  readonly perfilCompleto = computed(() => {
    const p = this.perfil();
    return !!(p?.skills && p?.aboutMe && p?.linkLifesheet);
  });

  // ---------------- Mensajes ----------------
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');

  // ---------------- Recomendación IA ----------------
  readonly recomendacionIa = signal<RecomendacionIaState>({
    abierto: false, cargando: false, totalAnalizadas: 0, resultado: '', error: ''
  });

  inicializar(): void {
    this.estudianteService.obtenerMiInformacion().subscribe({
      next: (est) => {
        this.estudiante.set(est);
        this.cargarPerfil();
        this.cargarPostulaciones();
        this.cargarPracticas();
      },
      error: () => this.errorIdentidad.set('No pudimos cargar tus datos de estudiante. Cierra sesión e ingresa de nuevo.')
    });
    this.cargarOfertas();
  }

  cargarOfertas(): void {
    this.cargandoOfertas.set(true);
    this.ofertaService.obtenerOfertasActivas().subscribe({
      next: (data) => { this.ofertas.set(data || []); this.cargandoOfertas.set(false); },
      error: () => { this.ofertas.set([]); this.cargandoOfertas.set(false); }
    });
  }

  cargarPostulaciones(): void {
    this.cargandoPostulaciones.set(true);
    this.estudianteService.obtenerMisPostulaciones().subscribe({
      next: (data) => { this.postulaciones.set(data || []); this.cargandoPostulaciones.set(false); },
      error: () => { this.postulaciones.set([]); this.cargandoPostulaciones.set(false); }
    });
  }

  cargarPracticas(): void {
    this.cargandoPracticas.set(true);
    this.estudianteService.obtenerMisPracticas().subscribe({
      next: (data) => { this.practicas.set(data || []); this.cargandoPracticas.set(false); },
      error: () => { this.practicas.set([]); this.cargandoPracticas.set(false); }
    });
  }

  /**
   * Envía la calificación a la empresa. `alTerminar(true)` si se guardó (para cerrar el modal);
   * el comentario queda pendiente de moderación por el administrador.
   */
  calificarEmpresa(calificacion: CalificacionEmpresa, alTerminar: (ok: boolean, error?: string) => void): void {
    this.enviandoCalificacion.set(true);
    this.estudianteService.calificarEmpresa(calificacion).subscribe({
      next: () => {
        this.enviandoCalificacion.set(false);
        this.mensajeExito.set('¡Gracias por tu evaluación! Se publicará cuando un administrador la revise.');
        this.cargarPracticas();
        alTerminar(true);
      },
      error: (err) => {
        this.enviandoCalificacion.set(false);
        alTerminar(false, typeof err?.error === 'string' && err.error ? err.error : 'No fue posible enviar tu evaluación. Intenta de nuevo.');
      }
    });
  }

  cargarPerfil(): void {
    const doc = this.documento();
    if (!doc) return;
    this.estudianteService.obtenerPerfil(doc).subscribe({
      next: (perfil) => this.perfil.set(perfil ?? { documentStudent: doc }),
      error: () => this.perfil.set({ documentStudent: doc })
    });
  }

  postularme(oferta: OfferRequestDTO): void {
    const doc = this.documento();
    if (!doc || !oferta.idOffer) {
      this.mensajeError.set('Aún estamos cargando tus datos. Intenta de nuevo en unos segundos.');
      return;
    }
    this.limpiarMensajes();
    this.procesandoOfertaId.set(oferta.idOffer);
    this.postulacionService.aplicarAOferta({ idOffer: oferta.idOffer, documentNumberStudent: doc }).subscribe({
      next: () => {
        this.procesandoOfertaId.set(null);
        this.mensajeExito.set(`Te postulaste a «${oferta.practiceName}». La empresa revisará tu perfil.`);
        this.cargarPostulaciones();
      },
      error: (err) => {
        this.procesandoOfertaId.set(null);
        this.mensajeError.set(typeof err?.error === 'string' && err.error ? err.error : 'No fue posible postularte. Intenta de nuevo.');
      }
    });
  }

  guardarPerfil(cambios: Partial<PerfilProfesional>, mensaje = 'Perfil profesional guardado.'): void {
    const doc = this.documento();
    if (!doc) return;
    const perfil: PerfilProfesional = { ...(this.perfil() ?? {}), ...cambios, documentStudent: doc };
    this.limpiarMensajes();
    this.estudianteService.guardarPerfil(perfil).subscribe({
      next: (guardado) => { this.perfil.set(guardado ?? perfil); this.mensajeExito.set(mensaje); },
      error: (err) => this.mensajeError.set(typeof err?.error === 'string' && err.error ? err.error : 'No se pudo guardar tu perfil.')
    });
  }

  abrirRecomendacionIa(): void {
    const doc = this.documento();
    if (!doc) return;
    this.recomendacionIa.set({ abierto: true, cargando: true, totalAnalizadas: 0, resultado: '', error: '' });
    this.iaService.recomendarOfertasEstudiante(doc).subscribe({
      next: (res) => this.recomendacionIa.update(s => ({
        ...s, cargando: false, totalAnalizadas: res.totalOffersAnalyzed, resultado: res.aiRecommendation
      })),
      error: () => this.recomendacionIa.update(s => ({
        ...s, cargando: false, error: 'No fue posible conectar con el asistente de IA en este momento.'
      }))
    });
  }

  cerrarRecomendacionIa(): void {
    this.recomendacionIa.update(s => ({ ...s, abierto: false }));
  }

  limpiarMensajes(): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');
  }
}
