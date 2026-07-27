import { Directive, booleanAttribute, computed, input } from '@angular/core';

/**
 * Estilo unico para inputs, selects y textareas.
 * `<input appInput>`, `<input appInput [invalido]="true">`.
 */
@Directive({
  selector: 'input[appInput], select[appInput], textarea[appInput]',
  host: {
    '[class]': 'clases()',
    '[attr.aria-invalid]': 'invalido() || null',
  },
})
export class InputCampo {
  readonly invalido = input(false, { transform: booleanAttribute });

  protected readonly clases = computed(
    () =>
      'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all ' +
      'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ' +
      'focus:outline-none focus:ring-2 focus:ring-marca-600/20 focus:border-marca-600 ' +
      (this.invalido()
        ? 'border-red-400 focus:ring-red-400/20'
        : 'border-slate-200 hover:border-slate-300'),
  );
}
