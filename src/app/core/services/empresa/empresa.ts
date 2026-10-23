import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Empresa {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.empresas}`;
  private adminUrl = `${environment.baseUrl}${environment.endpoints.adminEmpresas}`;
  constructor(private http: HttpClient) {}

  registrarEmpresa(datosEmpresa: any): Observable<any> {
    return this.http.post(this.apiUrl, datosEmpresa);
  }

  obtenerEmpresaPorNit(nit: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/nit/${nit}`);
  }
  
  subirArchivoCloudinary(archivo: File, carpeta: string): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<{ url: string }>(
      `${environment.baseUrl}/archivos/subir?carpeta=${carpeta}`,
      formData
    );
  }

  actualizarPerfilEmpresa(nit: string, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/nit/${nit}/perfil`, datos);
  }

  obtenerEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  obtenerTodasLasEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.adminUrl}/empresas/todas`);
  }
}
