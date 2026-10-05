import { Service } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class Estudiante {
    private apiUrl = `${environment.baseUrl}${environment.endpoints.estudiantes}`;
    constructor(private http: HttpClient) {}
    registrarEstudiante(datosEstudiante: any): Observable<any> {
    return this.http.post(this.apiUrl, datosEstudiante);
  }
  obtenerEstudiantes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
