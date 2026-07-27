import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import {
  CitaEvento,
  ConflictoDetalle,
  EstadoCita,
  Medico,
  Paciente,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Badge } from '../../ui/badge';
import { Btn } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { Field } from '../../ui/field';
import { InputCampo } from '../../ui/input';
import { Spinner } from '../../ui/spinner';
import { ESTADOS, ESTADOS_EDITABLES } from './estado';
import {
  contarOcurrencias,
  diaISO,
  fechaISO,
  horaHM,
  minutos,
  sumarMinutos,
} from './horario';
import { PacientePicker } from './paciente-picker';

export interface RangoInicial {
  inicio: Date;
  fin: Date;
}

const DIAS = [
  { iso: 1, letra: 'L', nombre: 'lunes' },
  { iso: 2, letra: 'M', nombre: 'martes' },
  { iso: 3, letra: 'X', nombre: 'miércoles' },
  { iso: 4, letra: 'J', nombre: 'jueves' },
  { iso: 5, letra: 'V', nombre: 'viernes' },
  { iso: 6, letra: 'S', nombre: 'sábado' },
  { iso: 7, letra: 'D', nombre: 'domingo' },
];

const DURACIONES = [30, 45, 60, 90];

@Component({
  selector: 'app-cita-dialog',
  imports: [Dialog, PacientePicker, Badge, Btn, Field, InputCampo, Spinner],
  template: `
    <app-dialog
      [abierto]="abierto()"
      [titulo]="esEdicion() ? 'Editar cita' : 'Nueva cita'"
      [descripcion]="medico().nombre"
      tamano="lg"
      (cerrar)="cerrar.emit()"
    >
      <form id="form-cita" class="space-y-5" (submit)="guardar($event)">
        @if (cita(); as c) {
          <div class="flex flex-wrap items-center gap-2">
            <app-badge [tono]="ESTADOS[c.extendedProps.estado].tono">
              {{ ESTADOS[c.extendedProps.estado].texto }}
            </app-badge>
            @if (c.extendedProps.serieId) {
              <app-badge tono="marca">Parte de una serie</app-badge>
              <span class="text-xs text-slate-500">Los cambios afectan solo a esta cita.</span>
            }
          </div>
        }

        <app-paciente-picker
          [(paciente)]="paciente"
          [error]="errorPaciente()"
          idInput="cita-paciente"
        />

        <div class="grid gap-4 sm:grid-cols-3">
          <app-field etiqueta="Fecha" para="cita-fecha" requerido>
            <input
              appInput
              id="cita-fecha"
              type="date"
              required
              [value]="fecha()"
              (input)="fecha.set($any($event.target).value)"
            />
          </app-field>

          <app-field etiqueta="Inicio" para="cita-inicio" requerido>
            <input
              appInput
              id="cita-inicio"
              type="time"
              step="300"
              required
              [value]="horaInicio()"
              (input)="cambiarInicio($any($event.target).value)"
            />
          </app-field>

          <app-field etiqueta="Fin" para="cita-fin" [error]="errorHoras()" requerido>
            <input
              appInput
              id="cita-fin"
              type="time"
              step="300"
              required
              [invalido]="!!errorHoras()"
              [value]="horaFin()"
              (input)="horaFin.set($any($event.target).value)"
            />
          </app-field>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-500">Duración</span>
          <div class="inline-flex overflow-hidden rounded-md border border-slate-300">
            @for (d of DURACIONES; track d; let primero = $first) {
              <button
                type="button"
                class="h-8 px-2.5 text-xs"
                [class]="
                  (duracion() === d
                    ? 'bg-slate-900 font-medium text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50') +
                  (primero ? '' : ' border-l border-slate-300')
                "
                [attr.aria-pressed]="duracion() === d"
                (click)="fijarDuracion(d)"
              >
                {{ d }} min
              </button>
            }
          </div>
          @if (duracion() > 0 && !DURACIONES.includes(duracion())) {
            <span class="text-xs text-slate-500">({{ duracion() }} min)</span>
          }
        </div>

        @if (esEdicion()) {
          <app-field etiqueta="Estado">
            <div class="inline-flex overflow-hidden rounded-md border border-slate-300">
              @for (e of ESTADOS_EDITABLES; track e; let primero = $first) {
                <button
                  type="button"
                  class="h-9 px-3 text-sm"
                  [class]="
                    (estado() === e
                      ? 'bg-slate-900 font-medium text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50') +
                    (primero ? '' : ' border-l border-slate-300')
                  "
                  [attr.aria-pressed]="estado() === e"
                  (click)="estado.set(e)"
                >
                  {{ ESTADOS[e].texto }}
                </button>
              }
            </div>
          </app-field>
        } @else {
          <div class="rounded-md border border-slate-200 p-4">
            <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                class="size-3.5 accent-slate-900"
                [checked]="recurrente()"
                (change)="recurrente.set($any($event.target).checked)"
              />
              Repetir cada semana
            </label>

            @if (recurrente()) {
              <div class="mt-4 space-y-4">
                <fieldset>
                  <legend class="mb-1.5 block text-sm font-medium text-slate-700">Días</legend>
                  <div class="flex flex-wrap gap-1.5">
                    @for (d of DIAS; track d.iso) {
                      <button
                        type="button"
                        class="size-9 rounded-md border text-sm"
                        [class]="
                          dias().has(d.iso)
                            ? 'border-slate-900 bg-slate-900 font-medium text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        "
                        [attr.aria-pressed]="dias().has(d.iso)"
                        [attr.aria-label]="d.nombre"
                        (click)="alternarDia(d.iso)"
                      >
                        {{ d.letra }}
                      </button>
                    }
                  </div>
                </fieldset>

                <app-field etiqueta="Repetir hasta" para="cita-hasta" [error]="errorSerie()">
                  <input
                    appInput
                    id="cita-hasta"
                    type="date"
                    [invalido]="!!errorSerie()"
                    [min]="fecha()"
                    [value]="fechaHasta()"
                    (input)="fechaHasta.set($any($event.target).value)"
                  />
                </app-field>

                @if (previsualizacion(); as n) {
                  <p class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Se intentarán crear <strong class="text-slate-900">{{ n }}</strong> citas. Las
                    fechas que choquen con otra cita del médico se omiten y se te avisa.
                  </p>
                }
              </div>
            }
          </div>
        }

        <app-field etiqueta="Notas" para="cita-notas" ayuda="Máximo 500 caracteres.">
          <textarea
            appInput
            id="cita-notas"
            rows="2"
            maxlength="500"
            [value]="notas()"
            (input)="notas.set($any($event.target).value)"
          ></textarea>
        </app-field>

        @if (error()) {
          <p
            class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {{ error() }}
          </p>
        }
      </form>

      @if (esEdicion() && cita()!.extendedProps.estado !== 'cancelada') {
        <button
          dialogFooter
          type="button"
          appBtn="peligro"
          class="mr-auto"
          [disabled]="guardando()"
          (click)="cancelarCita()"
        >
          Cancelar cita
        </button>
      }
      <button dialogFooter type="button" appBtn="suave" (click)="cerrar.emit()">Cerrar</button>
      <button dialogFooter type="submit" form="form-cita" appBtn [disabled]="guardando()">
        @if (guardando()) {
          <app-spinner />
        }
        {{ guardando() ? 'Guardando…' : 'Guardar' }}
      </button>
    </app-dialog>
  `,
})
export class CitaDialog {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly abierto = input.required<boolean>();
  readonly medico = input.required<Medico>();
  /** Cita a editar; `null` = alta nueva. */
  readonly cita = input<CitaEvento | null>(null);
  /** Rango preseleccionado en el calendario, para el alta. */
  readonly rango = input<RangoInicial | null>(null);

  readonly cerrar = output<void>();
  readonly guardado = output<void>();

  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly fecha = signal('');
  protected readonly horaInicio = signal('');
  protected readonly horaFin = signal('');
  protected readonly notas = signal('');
  protected readonly estado = signal<EstadoCita>('programada');
  protected readonly recurrente = signal(false);
  protected readonly dias = signal<ReadonlySet<number>>(new Set());
  protected readonly fechaHasta = signal('');
  protected readonly error = signal('');
  protected readonly errorPaciente = signal('');
  protected readonly guardando = signal(false);

  protected readonly esEdicion = computed(() => this.cita() !== null);

  protected readonly duracion = computed(() => {
    const d = minutos(this.horaFin()) - minutos(this.horaInicio());
    return Number.isFinite(d) ? d : 0;
  });

  protected readonly errorHoras = computed(() =>
    this.duracion() <= 0 ? 'Debe ser posterior al inicio.' : '',
  );

  protected readonly errorSerie = computed(() =>
    this.recurrente() && this.fechaHasta() && this.fechaHasta() < this.fecha()
      ? 'Debe ser posterior a la fecha de la cita.'
      : '',
  );

  /** Cuántas citas generaría la serie tal como está configurada ahora. */
  protected readonly previsualizacion = computed(() =>
    this.recurrente() && !this.errorSerie()
      ? contarOcurrencias(this.fecha(), this.fechaHasta(), this.dias())
      : 0,
  );

  protected readonly DIAS = DIAS;
  protected readonly DURACIONES = DURACIONES;
  protected readonly ESTADOS = ESTADOS;
  protected readonly ESTADOS_EDITABLES = ESTADOS_EDITABLES;

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      const cita = this.cita();
      const rango = this.rango();
      const inicio = cita ? new Date(cita.start) : (rango?.inicio ?? new Date());
      const fin = cita ? new Date(cita.end) : (rango?.fin ?? new Date());

      this.paciente.set(
        cita
          ? {
              id: cita.extendedProps.pacienteId,
              nombre: cita.extendedProps.pacienteNombre,
              telefono: null,
              notas: null,
            }
          : null,
      );
      this.fecha.set(fechaISO(inicio));
      this.horaInicio.set(horaHM(inicio));
      this.horaFin.set(horaHM(fin));
      this.notas.set(cita?.extendedProps.notas ?? '');
      this.estado.set(cita?.extendedProps.estado ?? 'programada');
      this.recurrente.set(false);
      this.dias.set(new Set([diaISO(inicio)]));
      this.fechaHasta.set(fechaISO(new Date(inicio.getTime() + 27 * 864e5)));
      this.error.set('');
      this.errorPaciente.set('');
    });
  }

  /** Mover el inicio arrastra el fin para conservar la duración. */
  protected cambiarInicio(valor: string): void {
    const dur = this.duracion();
    this.horaInicio.set(valor);
    if (dur > 0) this.horaFin.set(sumarMinutos(valor, dur));
  }

  protected fijarDuracion(mins: number): void {
    this.horaFin.set(sumarMinutos(this.horaInicio(), mins));
  }

  protected alternarDia(iso: number): void {
    this.dias.update((s) => {
      const copia = new Set(s);
      if (copia.has(iso)) {
        copia.delete(iso);
      } else {
        copia.add(iso);
      }
      return copia;
    });
  }

  protected async guardar(ev: Event): Promise<void> {
    ev.preventDefault();
    if (this.guardando()) return;
    this.error.set('');
    this.errorPaciente.set('');

    const paciente = this.paciente();
    if (!paciente) {
      this.errorPaciente.set('Elige o crea un paciente.');
      return;
    }
    if (this.errorHoras() || this.errorSerie()) return;

    const inicio = `${this.fecha()}T${this.horaInicio()}:00`;
    const fin = `${this.fecha()}T${this.horaFin()}:00`;

    this.guardando.set(true);
    try {
      const cita = this.cita();
      if (cita) {
        await this.api.editarCita(cita.extendedProps.citaId, {
          inicio,
          fin,
          paciente_id: paciente.id,
          estado: this.estado(),
          notas: this.notas() || null,
        });
        this.toasts.ok('Cita actualizada.');
      } else {
        await this.crearNueva(paciente, inicio, fin);
      }
      this.guardado.emit();
      this.cerrar.emit();
    } catch (e) {
      this.error.set(this.mensajeDeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  private async crearNueva(paciente: Paciente, inicio: string, fin: string): Promise<void> {
    if (!this.recurrente()) {
      await this.api.crearCita({
        medico_id: this.medico().id,
        paciente_id: paciente.id,
        inicio,
        fin,
        notas: this.notas() || null,
      });
      this.toasts.ok('Cita creada.');
      return;
    }

    if (this.dias().size === 0) {
      throw new Error('Elige al menos un día de la semana.');
    }

    const res = await this.api.crearSerie({
      medico_id: this.medico().id,
      paciente_id: paciente.id,
      dias_semana: [...this.dias()].sort(),
      hora_inicio: `${this.horaInicio()}:00`,
      hora_fin: `${this.horaFin()}:00`,
      fecha_desde: this.fecha(),
      fecha_hasta: this.fechaHasta(),
      notas: this.notas() || null,
    });

    const n = res.creadas.length;
    this.toasts.ok(
      res.conflictos.length
        ? `${n} cita(s) creadas. ${res.conflictos.length} fecha(s) se omitieron porque el horario ya estaba ocupado.`
        : `${n} cita(s) creadas.`,
    );
  }

  protected async cancelarCita(): Promise<void> {
    const cita = this.cita();
    if (!cita || this.guardando()) return;

    const ok = await this.confirm.pedir({
      titulo: '¿Cancelar esta cita?',
      mensaje:
        `Se marcará como cancelada y su horario volverá a quedar libre. ` +
        (cita.extendedProps.serieId
          ? 'Solo se cancela esta fecha, no el resto de la serie.'
          : 'La cita no se borra: queda en el historial.'),
      textoOk: 'Sí, cancelar',
      peligro: true,
    });
    if (!ok) return;

    this.guardando.set(true);
    try {
      await this.api.cancelarCita(cita.extendedProps.citaId);
      this.toasts.ok('Cita cancelada.');
      this.guardado.emit();
      this.cerrar.emit();
    } catch (e) {
      this.error.set(this.mensajeDeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  private mensajeDeError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 409) {
        const d = e.error?.detail as ConflictoDetalle | undefined;
        return d
          ? `Ese horario ya está ocupado por ${d.paciente} (${new Date(d.inicio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}).`
          : 'Ese horario ya está ocupado.';
      }
      if (e.status === 403) return 'No tienes permiso para agendar con este médico.';
      if (e.status === 0) return 'No hay conexión con el servidor.';
      return 'No se pudo guardar. Intenta de nuevo.';
    }
    return e instanceof Error ? e.message : 'No se pudo guardar.';
  }
}
