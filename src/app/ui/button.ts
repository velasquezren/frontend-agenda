import { Directive, computed, input } from '@angular/core';

export type VarianteBoton = 'primario' | 'suave' | 'peligro' | 'fantasma' | 'texto';
export type TamanoBoton = 'sm' | 'md' | 'lg' | 'icono';

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-slate-900 text-white hover:bg-slate-700',
  suave: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  peligro: 'border border-slate-300 bg-white text-red-700 hover:bg-red-50',
  fantasma: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  texto: 'text-slate-600 underline underline-offset-2 hover:text-slate-900',
};

const TAMANOS: Record<TamanoBoton, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-xs',
  md: 'h-9 gap-2 rounded-md px-3 text-sm',
  lg: 'h-10 gap-2 rounded-md px-4 text-sm',
  icono: 'size-9 justify-center rounded-md',
};

/**
 * Boton de la app. `<button appBtn>`, `<button appBtn="suave" tamano="sm">`.
 *
 * Es una directiva y no un componente para que funcione igual sobre `<button>`
 * y `<a>`, sin envolver nada ni romper el submit de los formularios.
 */
@Directive({
  selector: 'button[appBtn], a[appBtn]',
  host: { '[class]': 'clases()' },
})
export class Btn {
  readonly variante = input<VarianteBoton | ''>('', { alias: 'appBtn' });
  readonly tamano = input<TamanoBoton>('md');

  protected readonly clases = computed(
    () =>
      'inline-flex items-center font-medium select-none ' +
      'disabled:pointer-events-none disabled:opacity-40 ' +
      `${TAMANOS[this.tamano()]} ${VARIANTES[this.variante() || 'primario']}`,
  );
}
