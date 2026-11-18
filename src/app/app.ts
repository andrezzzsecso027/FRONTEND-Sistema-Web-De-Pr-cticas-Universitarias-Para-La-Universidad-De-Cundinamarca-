import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmarCierreSesionModal } from './share/ui/confirmar-cierre-sesion/confirmar-cierre-sesion';

@Component({
  imports: [RouterOutlet, ConfirmarCierreSesionModal],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend-udecprac');
}
