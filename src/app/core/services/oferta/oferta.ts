import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Offer {
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
  offerStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Oferta {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.ofertas}`;

  constructor(private http: HttpClient) {}

  crearOferta(datosOferta: Offer): Observable<Offer> {
    console.log('[Oferta] Creando oferta:', datosOferta);
    return this.http.post<Offer>(`${this.apiUrl}/crear`, datosOferta);
  }

  obtenerOfertasActivas(): Observable<Offer[]> {
    return this.http.get<Offer[]>(`${this.apiUrl}/estudiantes`);
  }
}
