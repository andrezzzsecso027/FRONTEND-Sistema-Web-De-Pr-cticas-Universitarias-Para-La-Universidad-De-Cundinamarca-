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
import { PerfilEstudiante } from './features/Infrastructure/inbound/perfil-estudiante/perfil-estudiante';
import { PanelEstudiante } from './features/Infrastructure/inbound/panel-estudiante/panel-estudiante';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'registro-estudiante', component: RegistroEstudiante },
  { path: 'registro-empresa', component: RegistroEmpresa },
  { path: 'verificar-cuenta', component: VerificarCuenta },
  { path: 'panel-administrador', component: PanelAdministrador, canActivate: [adminGuard] },
  { path: 'panel-empresa', component: PanelEmpresa, canActivate: [empresaGuard] },
  // Portal del estudiante: layout con barra lateral y vistas hijas, todas protegidas por el guard
  // (antes /mi-perfil no tenía guard). Las URL se mantienen: /ofertas, /mis-postulaciones, /mi-perfil.
  {
    path: '',
    component: PanelEstudiante,
    canActivate: [estudianteGuard],
    children: [
      { path: 'ofertas', component: OfertaLista },
      { path: 'mis-postulaciones', component: MisPostulaciones },
      { path: 'mi-perfil', component: PerfilEstudiante }
    ]
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];