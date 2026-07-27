import { Component, inject } from '@angular/core';

import { ConfirmService } from '../core/confirm.service';
import { Btn } from './button';
import { Dialog } from './dialog';

/** Va una sola vez en el shell; dibuja lo que pida el ConfirmService. */
@Component({
  selector: 'app-confirm-host',
  imports: [Dialog, Btn],
  template: `
    @if (confirm.pendiente(); as p) {
      <app-dialog
        [abierto]="true"
        [titulo]="p.titulo"
        tamano="sm"
        (cerrar)="confirm.responder(false)"
      >
        <p class="text-sm text-slate-600">{{ p.mensaje }}</p>

        <button dialogFooter type="button" appBtn="suave" (click)="confirm.responder(false)">
          Volver
        </button>
        <button
          dialogFooter
          type="button"
          [appBtn]="p.peligro ? 'peligro' : 'primario'"
          (click)="confirm.responder(true)"
        >
          {{ p.textoOk ?? 'Confirmar' }}
        </button>
      </app-dialog>
    }
  `,
})
export class ConfirmHost {
  protected readonly confirm = inject(ConfirmService);
}
