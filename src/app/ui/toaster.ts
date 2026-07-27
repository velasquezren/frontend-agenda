import { Component, inject } from '@angular/core';

import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toaster',
  template: `
    <div
      class="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end gap-2.5 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96"
      role="status"
      aria-live="polite"
    >
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="agenda-toast pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white/95 p-3.5 text-sm shadow-xl shadow-slate-900/10 backdrop-blur-md transition-all"
          [class]="t.tipo === 'error' ? 'border-red-200' : 'border-emerald-200'"
        >
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-lg"
            [class]="t.tipo === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'"
          >
            @if (t.tipo === 'error') {
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            } @else {
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
          </div>

          <div class="flex-1 pt-0.5">
            <p class="text-xs font-semibold leading-tight" [class]="t.tipo === 'error' ? 'text-red-900' : 'text-slate-900'">
              {{ t.tipo === 'error' ? 'Notificación' : 'Confirmación' }}
            </p>
            <p class="mt-0.5 text-xs leading-relaxed text-slate-600">{{ t.texto }}</p>
          </div>

          <button
            type="button"
            class="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Descartar aviso"
            (click)="toasts.cerrar(t.id)"
          >
            <svg class="size-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class Toaster {
  protected readonly toasts = inject(ToastService);
}
