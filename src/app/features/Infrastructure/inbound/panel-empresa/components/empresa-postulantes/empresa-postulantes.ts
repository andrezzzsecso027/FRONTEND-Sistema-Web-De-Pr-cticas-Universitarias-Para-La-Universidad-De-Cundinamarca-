import { ChangeDetectorRef, Component, DestroyRef, ElementRef, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon } from '../../../../../../share/ui/icon/icon';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PostulacionService, PostulationDetailResponse } from '../../../../../../core/services/postulacion/postulacion';
import { environment } from '../../../../../../../environments/environment';
import { PanelEmpresaStore } from '../../panel-empresa.store';

/** Vista "Postulantes": candidatos de la oferta seleccionada; la empresa los acepta o rechaza. */
@Component({
  selector: 'app-empresa-postulantes',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './empresa-postulantes.html',
  host: { class: 'ui-view' }
})
export class EmpresaPostulantes implements OnInit {
  protected readonly store = inject(PanelEmpresaStore);
  private readonly postulacionService = inject(PostulacionService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  postulantes: PostulationDetailResponse[] = [];
  observacionesPorPostulante: { [idPostulation: number]: string } = {};
  cargando = false;
  private cargados = false;

  /** Postulante resaltado al llegar desde el ranking IA. */
  readonly resaltadoId = signal<number | null>(null);
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    // Si ya se está en esta vista cuando se elige un candidato del ranking, se resalta de inmediato.
    effect(() => {
      if (this.store.postulanteResaltadoId() !== null) untracked(() => this.resaltarPendiente());
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  /** Desplaza hasta el postulante elegido en el ranking y lo resalta unos segundos. */
  private resaltarPendiente(): void {
    const id = this.store.postulanteResaltadoId();
    if (id === null || !this.cargados) return;
    this.store.postulanteResaltadoId.set(null);
    this.resaltadoId.set(id);
    this.cdr.detectChanges();
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.resaltadoId.set(null), 4000);
    requestAnimationFrame(() => {
      const tarjeta = this.host.nativeElement.querySelector<HTMLElement>(`#postulante-${id}`);
      tarjeta?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tarjeta?.focus({ preventScroll: true });
    });
  }

  ngOnInit(): void {
    this.store.cargarContratosEmpresa();
    this.cargarPostulantes();
  }

  private cargarPostulantes(): void {
    const oferta = this.store.ofertaSeleccionada();
    if (!oferta?.idOffer) return;

    this.cargando = true;
    this.postulacionService.verPostuladosPorOferta(oferta.idOffer).subscribe({
      next: (lista) => {
        this.postulantes = (lista || []).filter(p => p.studentFullName && p.studentFullName.trim().length > 0);
        this.cargando = false;
        this.cargados = true;

        this.postulantes.forEach((post: any) => {
          if (!this.store.estadoSeguimientoContrato[post.idPostulation]) {
            this.store.estadoSeguimientoContrato[post.idPostulation] = 'EN_CURSO';
          }
          this.completarConPerfil(post);
        });
        this.cdr.detectChanges();
        this.resaltarPendiente();
      },
      error: () => {
        this.postulantes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  /** Completa la tarjeta del postulante con su perfil profesional (foto, habilidades, CV...). */
  private completarConPerfil(post: any): void {
    const doc = post.documentStudent || post.studentDocument;
    if (!doc) return;
    this.http.get<any>(`${environment.baseUrl}/registro/estudiantes/perfil/${doc}`).subscribe({
      next: (perfil) => {
        if (!perfil) return;
        post.photoUrl = perfil.photoUrl || post.photoUrl;
        post.skills = perfil.skills || post.skills;
        post.englishLevel = perfil.englishLevel || post.englishLevel;
        post.githubUrl = perfil.githubUrl || post.githubUrl;
        post.lifesheet = perfil.linkLifesheet || post.lifesheet;
        post.aboutMe = perfil.aboutMe || post.aboutMe;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  decidirPostulacion(postulante: PostulationDetailResponse, nuevoEstado: 'ACEPTADA' | 'RECHAZADA'): void {
    const observacion = this.observacionesPorPostulante[postulante.idPostulation] ||
      (nuevoEstado === 'ACEPTADA'
        ? 'Cumple con el perfil requerido para la práctica.'
        : 'Perfil no seleccionado en esta convocatoria.');

    this.cargando = true;
    this.store.limpiarMensajes();

    this.postulacionService.cambiarEstadoPostulacion(postulante.idPostulation, nuevoEstado, observacion).subscribe({
      next: () => {
        this.cargando = false;
        postulante.statusPostulation = nuevoEstado;
        this.store.mensajeExito.set(nuevoEstado === 'ACEPTADA'
          ? `¡Has ACEPTADO a ${postulante.studentFullName}! Se envió correo de aceptación y se habilitó su expediente en "Mis Prácticas".`
          : `Se ha RECHAZADO la postulación de ${postulante.studentFullName}.`);
        if (nuevoEstado === 'ACEPTADA') {
          this.store.registrarAceptacion(postulante.idPostulation, observacion);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.cargando = false;
        this.store.mensajeError.set(typeof err?.error === 'string' && err.error
          ? err.error
          : 'Error al actualizar el estado de la postulación.');
        this.cdr.detectChanges();
      }
    });
  }
}
