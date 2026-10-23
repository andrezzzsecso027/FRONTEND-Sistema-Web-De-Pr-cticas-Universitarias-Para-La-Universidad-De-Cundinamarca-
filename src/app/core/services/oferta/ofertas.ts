import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface OfferRequestDTO {
  idOffer?: number;
  practiceName: string;
  nitCompanyAssociated: string;
  practiceDescription: string;
  profession: string;
  salary: number;
  modality: string;
  location: string;
  availableSpots: number;
  closingDate: string;
  publicationDate?: string;
  offerStatus?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OfertaService {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.ofertas}`;

  constructor(private http: HttpClient) {}

  crearOferta(datosOferta: OfferRequestDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/crear`, datosOferta);
  }
  listarOfertasActivas(): Observable<OfferRequestDTO[]> {
    return this.http.get<OfferRequestDTO[]>(`${this.apiUrl}/estudiantes`);
  }

 obtenerOfertasActivas(): Observable<OfferRequestDTO[]> {
    return this.http.get<OfferRequestDTO[]>(`${this.apiUrl}/estudiantes`);
  }
}