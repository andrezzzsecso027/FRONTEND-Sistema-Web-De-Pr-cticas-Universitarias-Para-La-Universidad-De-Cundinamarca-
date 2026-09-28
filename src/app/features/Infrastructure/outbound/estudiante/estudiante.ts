import { Service } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class Estudiante {
    private apiUrl = 'http://localhost:8081/api/registro/estudiantes';
    constructor(private http: HttpClient) {}
    registrarEstudiante(datosEstudiante: any): Observable<any> {
    return this.http.post(this.apiUrl, datosEstudiante);
  }
}
