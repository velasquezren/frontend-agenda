import { Component, ElementRef, input, model, viewChildren } from '@angular/core';

export interface Tab {
  id: string;
  etiqueta: string;
  /** Punto de color a la izquierda (el color del medico). */
  color?: string;
}

/**
 * Pestanas subrayadas con el patron ARIA completo: una sola parada de tabulador
 * y flechas / Inicio / Fin para moverse entre ellas.
 */
@Component({
  selector: 'app-tabs',
  template: `
    <div
      role="tablist"
      [attr.aria-label]="etiquetaLista()"
      class="flex flex-wrap items-center gap-5 border-b border-slate-200"
      (keydown)="alTeclear($event)"
    >
      @for (t of tabs(); track t.id) {
        <button
          #boton
          type="button"
          role="tab"
          [id]="'tab-' + t.id"
          [attr.aria-selected]="t.id === seleccionado()"
          [attr.aria-controls]="'panel-' + t.id"
          [tabindex]="t.id === seleccionado() ? 0 : -1"
          class="-mb-px inline-flex items-center gap-2 border-b-2 py-2 text-sm"
          [class]="
            t.id === seleccionado()
              ? 'border-slate-900 font-medium text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          "
          (click)="seleccionado.set(t.id)"
        >
          @if (t.color) {
            <span
              class="size-2 shrink-0 rounded-full"
              [style.background-color]="t.color"
              aria-hidden="true"
            ></span>
          }
          {{ t.etiqueta }}
        </button>
      }
    </div>
  `,
})
export class Tabs {
  readonly tabs = input.required<readonly Tab[]>();
  readonly seleccionado = model.required<string>();
  readonly etiquetaLista = input('Secciones');

  private readonly botones = viewChildren<ElementRef<HTMLButtonElement>>('boton');

  protected alTeclear(ev: KeyboardEvent): void {
    const ids = this.tabs().map((t) => t.id);
    const actual = ids.indexOf(this.seleccionado());
    if (actual < 0) return;

    const destino = {
      ArrowRight: (actual + 1) % ids.length,
      ArrowLeft: (actual - 1 + ids.length) % ids.length,
      Home: 0,
      End: ids.length - 1,
    }[ev.key];

    if (destino === undefined) return;
    ev.preventDefault();
    this.seleccionado.set(ids[destino]);
    this.botones()[destino]?.nativeElement.focus();
  }
}
