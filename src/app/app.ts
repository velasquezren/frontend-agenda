import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';
import { ConfirmHost } from './ui/confirm-host';
import { Toaster } from './ui/toaster';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toaster, ConfirmHost],
  template: `
    <router-outlet />
    <app-toaster />
    <app-confirm-host />
  `,
})
export class App {
  private readonly auth = inject(AuthService);

  constructor() {
    // Si ya hay token guardado, recuperamos quien es la licenciada.
    void this.auth.cargarLic().catch(() => undefined);
  }
}
