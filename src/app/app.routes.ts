import { Routes } from '@angular/router';
import { Home } from './features/Infrastructure/inbound/home/home';
import { Login } from './features/Infrastructure/inbound/login/login';
import { Registro } from './features/Infrastructure/inbound/registro/registro';
import { RegistroEstudiante } from './features/Infrastructure/inbound/registro-estudiante/registro-estudiante';
import { RegistroEmpresa } from './features/Infrastructure/inbound/registro-empresa/registro-empresa';
import { PanelAdministrador } from './features/Infrastructure/inbound/panel-administrador/panel-administrador';
import { OfertaLista } from './features/Infrastructure/inbound/oferta-lista/oferta-lista';
import { MisPostulaciones } from './features/Infrastructure/inbound/mis-postulaciones/mis-postulaciones';
import { VerificarCuenta } from './features/Infrastructure/inbound/verificar-cuenta/verificar-cuenta';
import { PanelEmpresa } from './features/Infrastructure/inbound/panel-empresa/panel-empresa';
import { adminGuard } from './core/guards/admin.guard';
import { estudianteGuard } from './core/guards/estudiante.guard';
import { empresaGuard } from './core/guards/empresa.guard';
import { invitadoGuard } from './core/guards/invitado.guard';
import { PerfilEstudiante } from './features/Infrastructure/inbound/perfil-estudiante/perfil-estudiante';
import { PanelEstudiante } from './features/Infrastructure/inbound/panel-estudiante/panel-estudiante';
import { MiPracticaVista } from './features/Infrastructure/inbound/mi-practica/mi-practica';

export const routes: Routes = [
  // Páginas públicas: si hay sesión abierta, invitadoGuard pregunta si se quiere cerrar antes de entrar.
  { path: '', component: Home, pathMatch: 'full', canActivate: [invitadoGuard] },
  { path: 'login', component: Login, canActivate: [invitadoGuard] },
  { path: 'registro', component: Registro, canActivate: [invitadoGuard] },
  { path: 'registro-estudiante', component: RegistroEstudiante, canActivate: [invitadoGuard] },
  { path: 'registro-empresa', component: RegistroEmpresa, canActivate: [invitadoGuard] },
  { path: 'verificar-cuenta', component: VerificarCuenta },
  { path: 'panel-administrador', component: PanelAdministrador, canActivate: [adminGuard] },
  { path: 'panel-empresa', component: PanelEmpresa, canActivate: [empresaGuard] },
  // Portal del estudiante: layout con barra lateral y vistas hijas, todas protegidas por el guard
  // (antes /mi-perfil no tenía guard). Las URL se mantienen: /ofertas, /mis-postulaciones, /mi-practica, /mi-perfil.
  {
    path: '',
    component: PanelEstudiante,
    canActivate: [estudianteGuard],
    children: [
      { path: 'ofertas', component: OfertaLista },
      { path: 'mis-postulaciones', component: MisPostulaciones },
      { path: 'mi-practica', component: MiPracticaVista },
      { path: 'mi-perfil', component: PerfilEstudiante }
    ]
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];