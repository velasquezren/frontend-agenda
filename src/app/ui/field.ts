import { Component, booleanAttribute, computed, input } from '@angular/core';

/**
 * Etiqueta + control + ayuda/error, con el `for`/`aria-describedby` ya atados.
 *
 *   <app-field etiqueta="Fecha" para="cita-fecha" [error]="err()">
 *     <input appInput id="cita-fecha" [attr.aria-describedby]="…" />
 *   </app-field>
 */
@Component({
  selector: 'app-field',
  template: `
    <div class="space-y-2">
      @if (etiqueta()) {
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700" [attr.for]="para()">
          {{ etiqueta() }}
          @if (requerido()) {
            <span class="text-red-500 font-bold" aria-hidden="true">*</span>
          }
        </label>
      }

      <ng-content />

      @if (error()) {
        <p [id]="idError()" class="text-xs text-red-700" role="alert">
          {{ error() }}
        </p>
      } @else if (ayuda()) {
        <p [id]="idAyuda()" class="text-xs text-slate-500">{{ ayuda() }}</p>
      }
    </div>
  `,
})
export class Field {
  readonly etiqueta = input('');
  readonly para = input('');
  readonly ayuda = input('');
  readonly error = input('');
  readonly requerido = input(false, { transform: booleanAttribute });

  readonly idAyuda = computed(() => `${this.para()}-ayuda`);
  readonly idError = computed(() => `${this.para()}-error`);

  /** Para colgar del `aria-describedby` del control proyectado. */
  readonly descritoPor = computed(() =>
    this.error() ? this.idError() : this.ayuda() ? this.idAyuda() : null,
  );
}
