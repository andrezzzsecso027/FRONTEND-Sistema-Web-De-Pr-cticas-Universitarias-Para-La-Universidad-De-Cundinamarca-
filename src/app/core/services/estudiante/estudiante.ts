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

  obtenerPerfil(documento: string): Observable<PerfilProfesional | null> {
    return this.http.get<PerfilProfesional | null>(`${this.apiUrl}/perfil/${documento}`);
  }

  guardarPerfil(perfil: PerfilProfesional): Observable<PerfilProfesional> {
    return this.http.post<PerfilProfesional>(`${this.apiUrl}/perfil`, perfil);
  }
}
