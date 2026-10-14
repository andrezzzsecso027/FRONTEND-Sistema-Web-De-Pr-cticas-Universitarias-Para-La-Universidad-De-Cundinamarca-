import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Practice {
  idPractice?: number;
  idPostulation: number;
  practiceStatus?: string;
  startDate?: string;
  endDate?: string;
  companyFeedback?: string;
  studentEvaluation?: string;
}

export interface UpdatePracticeRequest {
  startDate: string;
  endDate: string;
  practiceStatus: string;
}

@Injectable({
  providedIn: 'root'
})
export class Practica {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.practicas}`;

  constructor(private http: HttpClient) {}

  obtenerPracticaPorPostulacion(idPostulation: number): Observable<Practice> {
    return this.http.get<Practice>(`${this.apiUrl}/postulacion/${idPostulation}`);
  }

  actualizarPractica(idPractice: number, request: UpdatePracticeRequest): Observable<Practice> {
    return this.http.patch<Practice>(`${this.apiUrl}/${idPractice}`, request);
  }
}
