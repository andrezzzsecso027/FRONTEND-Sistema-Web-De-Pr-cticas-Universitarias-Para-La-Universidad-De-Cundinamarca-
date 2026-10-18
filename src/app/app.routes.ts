import { Routes } from '@angular/router';
import { Home } from './features/Infrastructure/inbound/home/home';
import { Login } from './features/Infrastructure/inbound/login/login';
import { Registro } from './features/Infrastructure/inbound/registro/registro';
import { RegistroEstudiante } from './features/Infrastructure/inbound/registro-estudiante/registro-estudiante';
import { RegistroEmpresa } from './features/Infrastructure/inbound/registro-empresa/registro-empresa';
import { PanelAdministrador } from './features/Infrastructure/inbound/panel-administrador/panel-administrador';
import { OfertaLista } from './features/Infrastructure/inbound/oferta-lista/oferta-lista';
import { adminGuard } from './core/guards/admin.guard';
import { PanelEmpresa } from './features/Infrastructure/inbound/panel-empresa/panel-empresa';
import { empresaGuard } from './core/guards/empresa.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'registro-estudiante', component: RegistroEstudiante },
  { path: 'registro-empresa', component: RegistroEmpresa },
  { path: 'ofertas', component: OfertaLista },
  { path: 'panel-administrador', component: PanelAdministrador, canActivate: [adminGuard] },
  { path: 'panel-empresa', component: PanelEmpresa, canActivate: [empresaGuard] },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
