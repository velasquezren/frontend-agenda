import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: `
    <svg
      class="animate-spin"
      [style.width.px]="tamano()"
      [style.height.px]="tamano()"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="2.5" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  `,
  host: { class: 'inline-flex' },
})
export class Spinner {
  readonly tamano = input(14);
}
