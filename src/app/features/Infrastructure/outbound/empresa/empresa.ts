import { Service } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})

export class Empresa {
    private apiUrl = 'http://localhost:8081/api/registro/empresas';
    constructor(private http: HttpClient) {}
    registrarEmpresa(datosEmpresa: any): Observable<any> {
    return this.http.post(this.apiUrl, datosEmpresa);
  }
}
