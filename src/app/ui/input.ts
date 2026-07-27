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
      'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 ' +
      'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ' +
      'disabled:text-slate-500 ' +
      (this.invalido() ? 'border-red-400' : 'border-slate-300'),
  );
}
