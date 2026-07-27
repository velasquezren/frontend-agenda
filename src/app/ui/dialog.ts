import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

let secuencia = 0;

const ANCHOS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

/**
 * Modal sobre el `<dialog>` nativo: trampa de foco, Esc y `aria-modal` gratis.
 *
 * El contenido por defecto va en el cuerpo (con scroll propio); lo que lleve el
 * atributo `dialogFooter` se ancla abajo.
 */
@Component({
  selector: 'app-dialog',
  template: `
    <!--
      m-auto es obligatorio: el preflight de Tailwind pone margin 0 a todo, y el
      centrado del dialog modal depende justo del margin auto que trae la hoja de
      estilos del navegador. Sin esto el modal sale arriba a la izquierda.
    -->
    <dialog
      #dlg
      class="m-auto w-[calc(100vw-1.5rem)] max-w-none rounded-lg bg-transparent p-0
             backdrop:bg-slate-900/40 sm:w-full"
      [class]="anchoClase()"
      [attr.aria-labelledby]="idTitulo"
      (cancel)="$event.preventDefault(); cerrar.emit()"
      (click)="alClicEnFondo($event)"
    >
      <div
        class="flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-lg
               border border-slate-300 bg-white text-slate-900 shadow-lg"
      >
        <header class="flex items-start gap-4 border-b border-slate-200 px-5 py-3.5">
          <div class="min-w-0 flex-1">
            <h2 [id]="idTitulo" class="truncate text-sm font-semibold text-slate-900">
              {{ titulo() }}
            </h2>
            @if (descripcion()) {
              <p class="mt-0.5 truncate text-xs text-slate-500">{{ descripcion() }}</p>
            }
          </div>
          <button
            type="button"
            class="-m-1 shrink-0 rounded p-1 text-slate-400 hover:text-slate-700"
            aria-label="Cerrar"
            (click)="cerrar.emit()"
          >
            <svg class="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ng-content />
        </div>

        <footer
          class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200
                 bg-slate-50 px-5 py-3"
        >
          <ng-content select="[dialogFooter]" />
        </footer>
      </div>
    </dialog>
  `,
})
export class Dialog {
  readonly abierto = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly descripcion = input('');
  readonly tamano = input<keyof typeof ANCHOS>('md');
  readonly cerrar = output<void>();

  protected readonly idTitulo = `dialog-titulo-${secuencia++}`;
  protected readonly anchoClase = computed(() => ANCHOS[this.tamano()]);

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.abierto()) {
        if (!el.open) el.showModal();
      } else if (el.open) {
        el.close();
      }
    });
  }

  /** Clic en el backdrop (el target es el propio `<dialog>`) = cerrar. */
  protected alClicEnFondo(ev: MouseEvent): void {
    if (ev.target === this.dlg().nativeElement) this.cerrar.emit();
  }
}
