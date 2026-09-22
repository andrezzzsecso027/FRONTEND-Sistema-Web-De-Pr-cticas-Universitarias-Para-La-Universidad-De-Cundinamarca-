import { Routes } from '@angular/router';
import { Home } from './features/Infrastructure/inbound/home/home';
import { Login } from './features/Infrastructure/inbound/login/login';
import { Registro } from './features/Infrastructure/inbound/registro/registro';
import { RegistroEstudiante } from './features/Infrastructure/inbound/registro-estudiante/registro-estudiante';
import { RegistroEmpresa } from './features/Infrastructure/inbound/registro-empresa/registro-empresa';


export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'registro-estudiante', component: RegistroEstudiante },
  { path: 'registro-empresa', component: RegistroEmpresa }
];
