import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PostulationRequest {
  idOffer: number;
  documentNumberStudent: string;
}

export interface PostulationDetailResponse {
  idPostulation: number;
  datePostulation: string;
  statusPostulation: string;
  documentStudent: string;
  studentFullName: string;
  studentEmail: string;
  skills: string;
  englishLevel: string;
  lifesheet: string;
  githubUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostulacionService {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.postulaciones}`;

  constructor(private http: HttpClient) {}
  
  aplicarAOferta(datos: PostulationRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/aplicar`, datos);
  }

  verPostuladosPorOferta(idOffer: number): Observable<PostulationDetailResponse[]> {
    return this.http.get<PostulationDetailResponse[]>(`${this.apiUrl}/oferta/${idOffer}`);
  }

  cambiarEstadoPostulacion(idPostulation: number, newStatus: string, observations: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${idPostulation}/estado`, {
      newStatus,
      observations
    });
  }

  verHistorialPostulacion(idPostulation: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${idPostulation}/historial`);
  }
}