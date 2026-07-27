import { Component, inject } from '@angular/core';

import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toaster',
  template: `
    <div
      class="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end gap-2
             sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80"
      role="status"
      aria-live="polite"
    >
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="agenda-toast pointer-events-auto flex w-full items-start gap-3 rounded-md border
                 bg-white px-3.5 py-2.5 text-sm shadow-md"
          [class]="t.tipo === 'error' ? 'border-red-300' : 'border-slate-300'"
        >
          <span
            class="mt-1.5 size-1.5 shrink-0 rounded-full"
            [class]="t.tipo === 'error' ? 'bg-red-600' : 'bg-emerald-600'"
            aria-hidden="true"
          ></span>

          <p class="flex-1 leading-snug text-slate-700">{{ t.texto }}</p>

          <button
            type="button"
            class="-m-1 shrink-0 rounded p-1 text-slate-400 hover:text-slate-700"
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
