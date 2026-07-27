import { Service, signal } from '@angular/core';

export interface PeticionConfirmacion {
  titulo: string;
  mensaje: string;
  textoOk?: string;
  peligro?: boolean;
}

interface Pendiente extends PeticionConfirmacion {
  resolver: (ok: boolean) => void;
}

/**
 * Confirmaciones sin `window.confirm`: se pide desde cualquier sitio y el
 * `<app-confirm-host />` del shell dibuja el modal.
 *
 *   if (!(await this.confirm.pedir({ titulo: '…', mensaje: '…' }))) return;
 */
@Service()
export class ConfirmService {
  private readonly _pendiente = signal<Pendiente | null>(null);
  readonly pendiente = this._pendiente.asReadonly();

  pedir(peticion: PeticionConfirmacion): Promise<boolean> {
    return new Promise((resolver) => {
      this._pendiente.set({ ...peticion, resolver });
    });
  }

  responder(ok: boolean): void {
    const p = this._pendiente();
    if (!p) return;
    this._pendiente.set(null);
    p.resolver(ok);
  }
}
