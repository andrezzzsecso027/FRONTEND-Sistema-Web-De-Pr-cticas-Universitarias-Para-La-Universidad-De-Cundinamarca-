import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Empresa {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.empresas}`;

  constructor(private http: HttpClient) {}

  registrarEmpresa(datosEmpresa: any): Observable<any> {
    return this.http.post(this.apiUrl, datosEmpresa);
  }

  obtenerEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
