import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AiStudentRecommendationResponse {
  studentDocument: string;
  totalOffersAnalyzed: number;
  aiRecommendation: string;
}

export interface AiOfferRankingResponse {
  idOffer: number;
  practiceName: string;
  totalCandidatesAnalyzed: number;
  aiRankingAnalysis: string;
}

@Injectable({
  providedIn: 'root'
})
export class IaSeguridadService {
  
  private readonly iaUrl = `${environment.baseUrl}/ia`;

  constructor(private readonly http: HttpClient) {}



  recomendarOfertasEstudiante(documento: string): Observable<AiStudentRecommendationResponse> {
    return this.http.get<AiStudentRecommendationResponse>(
      `${this.iaUrl}/recomendar-ofertas/${documento}`
    );
  }

  obtenerRankingPostulados(idOffer: number): Observable<AiOfferRankingResponse> {
    return this.http.get<AiOfferRankingResponse>(
      `${this.iaUrl}/ranking-postulados/${idOffer}`
    );
  }
}