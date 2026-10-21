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
import { adminGuard } from './core/guards/admin.guard';
import { estudianteGuard } from './core/guards/estudiante.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'registro-estudiante', component: RegistroEstudiante },
  { path: 'registro-empresa', component: RegistroEmpresa },
  { path: 'verificar-cuenta', component: VerificarCuenta },
  { path: 'ofertas', component: OfertaLista, canActivate: [estudianteGuard] },
  { path: 'mis-postulaciones', component: MisPostulaciones, canActivate: [estudianteGuard] },
  { path: 'panel-administrador', component: PanelAdministrador, canActivate: [adminGuard] },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];