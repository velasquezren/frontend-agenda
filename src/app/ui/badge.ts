import { Component, computed, input } from '@angular/core';

export type TonoBadge = 'neutro' | 'exito' | 'aviso' | 'error' | 'marca';

const TONOS: Record<TonoBadge, string> = {
  neutro: 'border-slate-200 bg-slate-50 text-slate-700',
  exito: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  aviso: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  marca: 'border-slate-300 bg-white text-slate-700',
};

@Component({
  selector: 'app-badge',
  template: '<ng-content />',
  host: {
    '[class]': 'clases()',
  },
})
export class Badge {
  readonly tono = input<TonoBadge>('neutro');

  protected readonly clases = computed(
    () =>
      'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ' +
      TONOS[this.tono()],
  );
}
