import { Service, signal } from '@angular/core';

export interface Toast {
  id: number;
  texto: string;
  tipo: 'ok' | 'error';
}

@Service()
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private siguienteId = 1;

  ok(texto: string): void {
    this.mostrar(texto, 'ok');
  }

  error(texto: string): void {
    this.mostrar(texto, 'error');
  }

  cerrar(id: number): void {
    this._toasts.update((ts) => ts.filter((t) => t.id !== id));
  }

  private mostrar(texto: string, tipo: Toast['tipo']): void {
    const id = this.siguienteId++;
    this._toasts.update((ts) => [...ts, { id, texto, tipo }]);
    setTimeout(() => this.cerrar(id), tipo === 'error' ? 6000 : 3500);
  }
}
