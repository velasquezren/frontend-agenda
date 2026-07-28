import { Component, input } from '@angular/core';

/**
 * Trazado del isotipo de Clínica Montalvo. Se exporta suelto porque el informe
 * imprimible se genera como HTML en una ventana aparte y necesita el mismo
 * dibujo sin poder usar el componente.
 */
export const LOGO_TRAZADOS = [
  `M46.9,532.8c0-282.3,228.9-511.2,511.3-511.2c178.8,0,336.2,91.8,427.5,230.8C901.6,143.3,769.7,73,621.3,73
   c-253.9,0-459.8,205.8-459.8,459.7c0,253.9,205.8,459.7,459.8,459.7c148.4,0,280.3-70.2,364.4-179.3
   c-91.4,139-248.7,230.8-427.5,230.8C275.8,1044,46.9,815.1,46.9,532.8z`,
  `M236.4,567.6c0-200.3,162.4-362.6,362.7-362.6c126.8,0,238.5,65.1,303.3,163.7
   c-59.6-77.4-153.2-127.2-258.5-127.2c-180.1,0-326.1,146-326.1,326.1s146,326.1,326.1,326.1c105.2,0,198.8-49.8,258.5-127.2
   c-64.8,98.6-176.4,163.7-303.3,163.7C398.8,930.2,236.4,767.9,236.4,567.6z`,
  `M803.5,498c15.6-22.9,41.9-38,71.7-38c47.8,0,86.6,38.8,86.6,86.6c0,47.8-38.8,86.6-86.6,86.6
   c-1.4,0-2.7,0-4.1-0.1c33.3-8.6,57.9-38.8,57.9-74.8c0-42.6-34.6-77.2-77.2-77.2C833.5,481,816.7,487.4,803.5,498z`,
  `M442.3,770.7c0,0,37.3-285.7,360.3-223.6C805.1,547.5,541.7,564.4,442.3,770.7z`,
];

/** El isotipo como SVG suelto, para incrustar en el informe imprimible. */
export function logoSvg(color: string, alto: number): string {
  return (
    `<svg viewBox="0 0 1080 1080" width="${alto}" height="${alto}" fill="${color}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    LOGO_TRAZADOS.map((d) => `<path d="${d}"/>`).join('') +
    `</svg>`
  );
}

/**
 * Isotipo de Clínica Montalvo. Pinta con `currentColor`, así que el color lo
 * decide la clase de texto del contenedor.
 */
@Component({
  selector: 'app-logo',
  template: `
    <svg
      viewBox="0 0 1080 1080"
      fill="currentColor"
      [style.width.px]="tamano()"
      [style.height.px]="tamano()"
      role="img"
      [attr.aria-label]="etiqueta() || null"
      [attr.aria-hidden]="etiqueta() ? null : true"
    >
      @for (d of trazados; track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  host: { class: 'inline-flex' },
})
export class Logo {
  readonly tamano = input(24);
  /** Si se pasa, el logo se anuncia; si no, queda como decorativo. */
  readonly etiqueta = input('');

  protected readonly trazados = LOGO_TRAZADOS;
}
