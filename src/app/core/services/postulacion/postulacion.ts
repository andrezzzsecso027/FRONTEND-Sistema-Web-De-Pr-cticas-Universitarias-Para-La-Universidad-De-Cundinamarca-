import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Postulation {
  idPostulation?: number;
  idOffer: number;
  documentNumberStudent: string;
  statePostulation?: string;
  applicationDate?: string;
  observations?: string;
}

export interface PostulationHistory {
  idHistory: number;
  idPostulation: number;
  previousState: string;
  newState: string;
  changeDate: string;
}

export interface UpdatePostulationRequest {
  newStatus: string;
  observations: string;
}

@Injectable({
  providedIn: 'root'
})
export class Postulacion {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.postulaciones}`;

  constructor(private http: HttpClient) {}

  aplicarAOferta(datos: { idOffer: number; documentNumberStudent: string }): Observable<Postulation> {
    console.log('[Postulacion] Aplicando a oferta:', datos);
    return this.http.post<Postulation>(`${this.apiUrl}/aplicar`, datos);
  }

  obtenerPostuladosDeOferta(idOffer: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/oferta/${idOffer}`);
  }

  cambiarEstado(idPostulation: number, request: UpdatePostulationRequest): Observable<Postulation> {
    return this.http.patch<Postulation>(`${this.apiUrl}/${idPostulation}/estado`, request);
  }

  obtenerHistorial(idPostulation: number): Observable<PostulationHistory[]> {
    return this.http.get<PostulationHistory[]>(`${this.apiUrl}/${idPostulation}/historial`);
  }
}
