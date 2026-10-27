import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';


export interface LegalRepresentativeDTO {
  nameRepresentative?: string;
  lastNameRepresentative?: string;
  numberDocument?: string;
}
export interface Company {
 idUser?: number;
  nit: string;
  companyName: string;
  legalName?: string;
  companyType?: string;
  companyAddress?: string;
  companyPhoneNumber?: string;
  email?: string;
  correo?: string;
  department?: string;
  city?: string;
  verificationStatus?: string;
  logoUrl?: string;
  rutPdfUrl?: string;
  urlPdfNit?: string;
  companyDescription?: string;
  legalRepresentative?: LegalRepresentativeDTO;
  nameRepresentive?: string;
  lastNameRepresentive?: string;
  numberDocument?: string;
}
export interface StudentProfileDTO {
  idProfile?: number;
  documentStudent: string;
  skills?: string;
  englishLevel?: string;
  linkLifesheet?: string;
  githubUrl?: string;
  aboutMe?: string;
  photoUrl?: string;
}
export interface OfferAdminDTO {
  idOffer: number;
  practiceName: string;
  practiceDescription: string;
  profession: string;
  modality: string;
  salary: number;
  location: string;
  availableSpots: number;
  PublicationDate?: string;
  publicationDate?: string;
  closingDate?: string;
  nitCompanyAssociated: string;
  statusOffer?: boolean | string;
}
export interface CommentAdminDTO {
  idComment: number;
  idPractice: number;
  nitCompany: string;
  studentName: string;
  content: string;
  rating: number;
  createdAt?: string;
  status?: boolean |string;
}
export interface PracticeAdminDTO {
  idPractice: number;
  idPostulation?: number;
  studentDocument: string;
  idOffer: number;
  startDate?: string;
  endDate?: string;
  statusPractice: boolean | string;
}


export interface AlumnoEnPracticaView {
idPractice: number;
  idPostulation: number;
  studentDocument: string;
  studentFullName: string;
  studentProgram: string;
  offerId: number;
  offerName: string;
  offerDescription: string;
  modality: string;
  location: string;
  salary: number;
  nitCompany: string;
  companyName: string;
  startDate: string;
  endDate: string;
  closingDate: string;
  statusPractice: string;
}

@Injectable({
  providedIn: 'root'
})
export class Admin {
  private apiUrl = `${environment.baseUrl}${environment.endpoints.adminEmpresas}`;
  private readonly archivosUrl = `${environment.baseUrl}/archivos`;

  constructor(private http: HttpClient) {}

  obtenerEmpresasPendientes(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/empresas/pendientes`);
  }

  obtenerTodasLasEmpresas(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/empresas/todas`);
  }

  verificarEmpresa(nit: string, aprobada: boolean): Observable<string> {
    return this.http.put(
      `${this.apiUrl}/empresas/${nit}/verificar`,
      { aprobada },
      { responseType: 'text' }
    );
  }

  obtenerEstudiantes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/estudiantes`);
  }

  obtenerPerfilEstudiante(documento: string): Observable<StudentProfileDTO> {
    return this.http.get<StudentProfileDTO>(`${this.apiUrl}/estudiantes/${documento}/perfil`);
  }

  obtenerTodasLasOfertas(): Observable<OfferAdminDTO[]> {
    return this.http.get<OfferAdminDTO[]>(`${this.apiUrl}/ofertas`);
  }

  cerrarOfertaPorAdmin(idOffer: number): Observable<string> {
    return this.http.patch(
      `${this.apiUrl}/ofertas/${idOffer}/cerrar`,
      {},
      { responseType: 'text' }
    );
  }

  obtenerComentariosPendientes(): Observable<CommentAdminDTO[]> {
    return this.http.get<CommentAdminDTO[]>(`${this.apiUrl}/comentarios/pendientes`);
  }

  moderarComentario(idComment: number, aprobado: boolean): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/comentarios/${idComment}/moderar?aprobado=${aprobado}`,
      {}
    );
  }

  obtenerTodasLasPracticas(): Observable<PracticeAdminDTO[]> {
    return this.http.get<PracticeAdminDTO[]>(`${this.apiUrl}/practicas`);
  }

  subirFotoAdminCloudinary(archivo: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('carpeta', 'admin_perfil');
    return this.http.post<{ url: string }>(`${this.archivosUrl}/subir`, formData);
  }
}
