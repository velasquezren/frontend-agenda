import { Component, computed, inject, input, model, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { Paciente } from '../../core/models';
import { Btn } from '../../ui/button';
import { Field } from '../../ui/field';
import { InputCampo } from '../../ui/input';
import { Spinner } from '../../ui/spinner';

/** Buscador de pacientes con alta al vuelo y navegación por teclado. */
@Component({
  selector: 'app-paciente-picker',
  imports: [Btn, Field, InputCampo, Spinner],
  template: `
    @if (paciente(); as p) {
      <app-field etiqueta="Paciente">
        <div
          class="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-slate-900">{{ p.nombre }}</span>
            @if (p.telefono) {
              <span class="block truncate text-xs text-slate-500">{{ p.telefono }}</span>
            }
          </span>
          <button type="button" appBtn="texto" tamano="sm" (click)="limpiar()">Cambiar</button>
        </div>
      </app-field>
    } @else {
      <app-field etiqueta="Paciente" [para]="idInput()" [error]="mensajeError()" requerido>
        <div class="relative">
          <input
            appInput
            [id]="idInput()"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            [attr.aria-expanded]="desplegado()"
            [attr.aria-controls]="idLista()"
            [attr.aria-activedescendant]="idOpcionActiva()"
            [invalido]="!!mensajeError()"
            placeholder="Escribe el nombre…"
            autocomplete="off"
            [value]="termino()"
            (input)="buscar($any($event.target).value)"
            (keydown)="alTeclear($event)"
          />

          @if (buscando()) {
            <span class="absolute top-2.5 right-3 text-slate-400">
              <app-spinner />
            </span>
          }

          @if (desplegado()) {
            <ul
              [id]="idLista()"
              role="listbox"
              aria-label="Pacientes"
              class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border
                     border-slate-300 bg-white py-1 shadow-md"
            >
              @for (p of resultados(); track p.id; let i = $index) {
                <li role="option" [id]="idInput() + '-op-' + i" [attr.aria-selected]="i === activo()">
                  <button
                    type="button"
                    tabindex="-1"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    [class]="i === activo() ? 'bg-slate-100 text-slate-900' : 'text-slate-700'"
                    (mouseenter)="activo.set(i)"
                    (click)="elegir(p)"
                  >
                    <span class="min-w-0 flex-1 truncate font-medium">{{ p.nombre }}</span>
                    @if (p.telefono) {
                      <span class="shrink-0 text-xs text-slate-500">{{ p.telefono }}</span>
                    }
                  </button>
                </li>
              } @empty {
                @if (!buscando()) {
                  <li class="px-3 py-2 text-sm text-slate-500">Ningún paciente coincide.</li>
                }
              }

              <li
                role="option"
                [id]="idInput() + '-op-' + resultados().length"
                [attr.aria-selected]="activo() === resultados().length"
                class="mt-1 border-t border-slate-100 pt-1"
              >
                <button
                  type="button"
                  tabindex="-1"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
                  [class]="
                    activo() === resultados().length
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700'
                  "
                  [disabled]="creando()"
                  (mouseenter)="activo.set(resultados().length)"
                  (click)="crear()"
                >
                  @if (creando()) {
                    <app-spinner />
                  } @else {
                    <span aria-hidden="true" class="text-base leading-none">+</span>
                  }
                  Crear «{{ termino().trim() }}»
                </button>
              </li>
            </ul>
          }
        </div>
      </app-field>
    }
  `,
})
export class PacientePicker {
  private readonly api = inject(ApiService);

  /** Paciente elegido; el diálogo lo lee con two-way binding. */
  readonly paciente = model<Paciente | null>(null);
  readonly idInput = input('paciente-buscar');
  readonly error = input('');

  protected readonly termino = signal('');
  protected readonly resultados = signal<Paciente[]>([]);
  protected readonly buscando = signal(false);
  protected readonly creando = signal(false);
  /** Índice resaltado; `resultados().length` es la opción "Crear …". */
  protected readonly activo = signal(0);
  /**
   * Los fallos se muestran aquí y no como toast: el `<dialog>` nativo vive en
   * el top layer, así que cualquier aviso flotante quedaría tapado por él.
   */
  private readonly errorLocal = signal('');
  protected readonly mensajeError = computed(() => this.errorLocal() || this.error());

  protected readonly desplegado = computed(() => this.termino().trim().length > 0);
  protected readonly idLista = computed(() => `${this.idInput()}-lista`);
  protected readonly idOpcionActiva = computed(() =>
    this.desplegado() ? `${this.idInput()}-op-${this.activo()}` : null,
  );

  private timer: ReturnType<typeof setTimeout> | undefined;

  protected buscar(texto: string): void {
    this.termino.set(texto);
    this.activo.set(0);
    this.errorLocal.set('');
    clearTimeout(this.timer);
    if (!texto.trim()) {
      this.resultados.set([]);
      this.buscando.set(false);
      return;
    }
    this.buscando.set(true);
    this.timer = setTimeout(async () => {
      try {
        this.resultados.set(await this.api.pacientes(texto.trim()));
      } catch {
        this.resultados.set([]);
      } finally {
        this.buscando.set(false);
      }
    }, 250);
  }

  protected alTeclear(ev: KeyboardEvent): void {
    if (!this.desplegado()) return;
    const ultimo = this.resultados().length; // la opción "Crear …"

    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        this.activo.update((i) => (i >= ultimo ? 0 : i + 1));
        break;
      case 'ArrowUp':
        ev.preventDefault();
        this.activo.update((i) => (i <= 0 ? ultimo : i - 1));
        break;
      case 'Enter': {
        ev.preventDefault();
        const p = this.resultados()[this.activo()];
        if (p) {
          this.elegir(p);
        } else {
          void this.crear();
        }
        break;
      }
      case 'Escape':
        ev.preventDefault();
        this.termino.set('');
        this.resultados.set([]);
        break;
    }
  }

  protected elegir(p: Paciente): void {
    this.paciente.set(p);
    this.termino.set('');
    this.resultados.set([]);
    this.activo.set(0);
  }

  protected limpiar(): void {
    this.paciente.set(null);
    this.termino.set('');
    this.resultados.set([]);
    this.activo.set(0);
  }

  protected async crear(): Promise<void> {
    const nombre = this.termino().trim();
    if (!nombre || this.creando()) return;
    this.creando.set(true);
    try {
      this.elegir(await this.api.crearPaciente(nombre));
    } catch {
      this.errorLocal.set('No se pudo crear el paciente.');
    } finally {
      this.creando.set(false);
    }
  }
}
