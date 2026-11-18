import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Datos del estudiante autenticado (GET /api/estudiantes/me). */
export interface EstudianteActual {
  idUser: number;
  document: string;
  name: string;
  lastName: string;
  addres?: string;
  phoneNumber?: string;
  headquarters?: string;
  academicProgram?: string;
}

/** Perfil profesional (hoja de vida extendida). */
export interface PerfilProfesional {
  documentStudent: string;
  aboutMe?: string;
  skills?: string;
  englishLevel?: string;
  githubUrl?: string;
  linkLifesheet?: string;
  photoUrl?: string;
}

/** Una postulación propia con la oferta y la empresa (GET /api/estudiantes/me/postulaciones). */
export interface MiPostulacion {
  idPostulation: number;
  idOffer: number;
  offerName: string;
  profession?: string;
  modality?: string;
  location?: string;
  companyName?: string;
  status: 'POSTULADA' | 'ACEPTADA' | 'RECHAZADA';
  datePostulation: string;
  dateUpdate?: string;
  observations?: string;
}

export type EstadoPractica = 'EN_CURSO' | 'FINALIZADA';
export type EstadoModeracion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/** Seguimiento de una práctica propia (GET /api/estudiantes/me/practicas). */
export interface MiPractica {
  idPractice: number;
  idPostulation: number;
  practiceStatus: EstadoPractica;
  startDate?: string;
  endDate?: string;
  companyFeedback?: string;
  offerName: string;
  profession?: string;
  modality?: string;
  location?: string;
  companyName?: string;
  datePostulation?: string;
  dateAccepted?: string;
  contract?: {
    trackingStatus: 'EN_CURSO' | 'CONTRATO_FIRMADO' | 'FINALIZADA';
    fileName?: string;
    fileUrl?: string;
    companyComments?: string;
    uploadDate?: string;
  } | null;
  evaluation?: {
    companyRating: number;
    commentText: string;
    validationStatus: EstadoModeracion;
    commentDate?: string;
  } | null;
}

/** Calificación del estudiante a la empresa de una práctica finalizada (POST /api/comentarios/crear). */
export interface CalificacionEmpresa {
  idPractice: number;
  companyRating: number;
  commentText: string;
}

@Injectable({
  providedIn: 'root'
})
export class Estudiante {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.estudiantes}`;

  constructor(private http: HttpClient) {}

  registrarEstudiante(datosEstudiante: any): Observable<any> {
    return this.http.post(this.apiUrl, datosEstudiante);
  }

  obtenerEstudiantes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  /** El backend identifica al estudiante por el token: no hace falta enviar la cédula. */
  obtenerMiInformacion(): Observable<EstudianteActual> {
    return this.http.get<EstudianteActual>(`${environment.baseUrl}/estudiantes/me`);
  }

  obtenerMisPostulaciones(): Observable<MiPostulacion[]> {
    return this.http.get<MiPostulacion[]>(`${environment.baseUrl}/estudiantes/me/postulaciones`);
  }

  obtenerMisPracticas(): Observable<MiPractica[]> {
    return this.http.get<MiPractica[]>(`${environment.baseUrl}/estudiantes/me/practicas`);
  }

  /** El backend valida que la práctica sea del estudiante del token, que esté FINALIZADA y la nota (1–5). */
  calificarEmpresa(calificacion: CalificacionEmpresa): Observable<unknown> {
    return this.http.post(`${environment.baseUrl}/comentarios/crear`, calificacion);
  }

  obtenerPerfil(documento: string): Observable<PerfilProfesional | null> {
    return this.http.get<PerfilProfesional | null>(`${this.apiUrl}/perfil/${documento}`);
  }

  guardarPerfil(perfil: PerfilProfesional): Observable<PerfilProfesional> {
    return this.http.post<PerfilProfesional>(`${this.apiUrl}/perfil`, perfil);
  }
}
