import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Una oferta recomendada por la IA (o por el cálculo local de respaldo). */
export interface OfertaRecomendada {
  idOffer: number;
  practiceName: string;
  /** Compatibilidad 0–100. */
  match: number;
  reason: string;
}

export interface AiStudentRecommendationResponse {
  studentDocument: string;
  totalOffersAnalyzed: number;
  /** Resumen en texto (compatibilidad con clientes anteriores). */
  aiRecommendation: string;
  /** Top de ofertas recomendadas, de la más a la menos compatible. */
  recommendations?: OfertaRecomendada[];
  /** false cuando la IA no respondió y se usó el cálculo local. */
  aiPowered?: boolean;
}

/** Un postulado en el ranking IA de una oferta. */
export interface CandidatoRankeado {
  idPostulation: number;
  studentFullName: string;
  /** Compatibilidad 0–100. */
  match: number;
  reason: string;
}

export interface AiOfferRankingResponse {
  idOffer: number;
  practiceName: string;
  totalCandidatesAnalyzed: number;
  /** Resumen en texto (compatibilidad con clientes anteriores). */
  aiRankingAnalysis: string;
  /** Ranking del más al menos compatible. */
  ranking?: CandidatoRankeado[];
  /** false cuando la IA no respondió y se usó el cálculo local. */
  aiPowered?: boolean;
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