import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Company {
  nit: string;
  companyName: string;
  companyType: string;
  companyAddress: string;
  companyPhoneNumber: string;
  legalName: string;
  city: string;
  department: string;
  approvalState?: string;
  correoContacto?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Admin {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.adminEmpresas}`;

  constructor(private http: HttpClient) {}

  obtenerEmpresasPendientes(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/pendientes`);
  }

  verificarEmpresa(nit: string, aprobada: boolean): Observable<string> {
    return this.http.put(`${this.apiUrl}/${nit}/verificar`, { aprobada }, { responseType: 'text' });
  }
}
