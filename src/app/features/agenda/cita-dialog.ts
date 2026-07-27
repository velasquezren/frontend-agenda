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
      [titulo]="esEdicion() ? 'Editar cita médica' : 'Nueva cita médica'"
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
              <app-badge tono="marca">Serie recurrente</app-badge>
              <span class="text-xs text-slate-500">Los cambios aplican únicamente a esta cita.</span>
            }
          </div>
        }

        <!-- Selección de Paciente -->
        <app-paciente-picker
          [(paciente)]="paciente"
          [error]="errorPaciente()"
          idInput="cita-paciente"
        />

        <!-- Selección de Fecha y Rango de Horario con amplio espacio -->
        <div class="space-y-5">
          <!-- Fecha -->
          <app-field etiqueta="Fecha de la sesión" para="cita-fecha" requerido>
            <input
              appInput
              id="cita-fecha"
              type="date"
              required
              class="font-medium"
              [value]="fecha()"
              (input)="fecha.set($any($event.target).value)"
            />
          </app-field>

          <!-- Horarios de Inicio y Fin con espacio amplio entre columnas -->
          <div class="grid gap-5 sm:grid-cols-2">
            <app-field etiqueta="Hora de inicio" para="cita-inicio" requerido>
              <input
                appInput
                id="cita-inicio"
                type="time"
                step="300"
                required
                class="font-medium"
                [value]="horaInicio()"
                (input)="cambiarInicio($any($event.target).value)"
              />
            </app-field>

            <app-field etiqueta="Hora de fin" para="cita-fin" [error]="errorHoras()" requerido>
              <input
                appInput
                id="cita-fin"
                type="time"
                step="300"
                required
                class="font-medium"
                [invalido]="!!errorHoras()"
                [value]="horaFin()"
                (input)="horaFin.set($any($event.target).value)"
              />
            </app-field>
          </div>
        </div>

        <!-- Botonera interactiva de Duración -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Duración sugerida
          </label>
          <div class="flex flex-wrap items-center gap-2">
            @for (d of DURACIONES; track d) {
              <button
                type="button"
                class="h-9 rounded-xl border px-3.5 text-xs font-semibold transition-all"
                [class]="
                  duracion() === d
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                    : 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                "
                [attr.aria-pressed]="duracion() === d"
                (click)="fijarDuracion(d)"
              >
                {{ d }} min
              </button>
            }
            @if (duracion() > 0 && !DURACIONES.includes(duracion())) {
              <span class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                Personalizado: {{ duracion() }} min
              </span>
            }
          </div>
        </div>

        @if (esEdicion()) {
          <app-field etiqueta="Estado de la cita">
            <div class="flex flex-wrap gap-1.5">
              @for (e of ESTADOS_EDITABLES; track e) {
                <button
                  type="button"
                  class="h-8.5 rounded-xl border px-3.5 text-xs font-medium transition-all"
                  [class]="
                    estado() === e
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
          <div class="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all">
            <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800 select-none">
              <input
                type="checkbox"
                class="size-4 rounded accent-slate-900"
                [checked]="recurrente()"
                (change)="recurrente.set($any($event.target).checked)"
              />
              Repetir semanalmente (Serie)
            </label>

            @if (recurrente()) {
              <div class="mt-4 space-y-4 pt-3 border-t border-slate-200/60">
                <fieldset>
                  <legend class="mb-2 block text-xs font-medium text-slate-600">Días de la semana</legend>
                  <div class="flex flex-wrap gap-1.5">
                    @for (d of DIAS; track d.iso) {
                      <button
                        type="button"
                        class="size-9 rounded-xl border text-xs font-semibold transition-all"
                        [class]="
                          dias().has(d.iso)
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
                  <div class="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    Se agendarán <strong class="font-bold text-slate-900">{{ n }}</strong> sesiones en total. Si alguna fecha presenta conflicto con otra cita, esa fecha será omitida de la serie.
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Resumen interactivo en tiempo real -->
        @if (paciente(); as p) {
          <div class="flex items-center gap-3 rounded-xl border border-marca-200/80 bg-marca-50/50 p-3.5 text-xs text-slate-700">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-marca-600/10 text-marca-700">
              <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="leading-tight">
              <span class="font-semibold text-slate-900">{{ p.nombre }}</span>
              <span class="text-slate-500"> • {{ medico().nombre }}</span>
              <p class="mt-0.5 font-medium text-marca-700">
                {{ fecha() }} ({{ horaInicio() }} - {{ horaFin() }}) • {{ duracion() }} min
              </p>
            </div>
          </div>
        }

        <app-field etiqueta="Notas adicionales" para="cita-notas" ayuda="Máximo 500 caracteres.">
          <textarea
            appInput
            id="cita-notas"
            rows="2"
            maxlength="500"
            placeholder="Observaciones de la sesión médica..."
            [value]="notas()"
            (input)="notas.set($any($event.target).value)"
          ></textarea>
        </app-field>

        @if (error()) {
          <div
            class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
            role="alert"
          >
            <svg class="size-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ error() }}</span>
          </div>
        }
      </form>

      @if (esEdicion() && cita()!.extendedProps.estado !== 'cancelada') {
        <button
          dialogFooter
          type="button"
          appBtn="peligro"
          class="mr-auto rounded-xl"
          [disabled]="guardando()"
          (click)="cancelarCita()"
        >
          Cancelar cita
        </button>
      }
      <button dialogFooter type="button" appBtn="suave" class="rounded-xl" (click)="cerrar.emit()">Cerrar</button>
      <button dialogFooter type="submit" form="form-cita" appBtn class="rounded-xl font-semibold shadow-sm" [disabled]="guardando()">
        @if (guardando()) {
          <app-spinner />
        }
        {{ guardando() ? 'Guardando…' : 'Guardar Cita' }}
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
    this.duracion() <= 0 ? 'La hora de fin debe ser posterior a la de inicio.' : '',
  );

  protected readonly errorSerie = computed(() =>
    this.recurrente() && this.fechaHasta() && this.fechaHasta() < this.fecha()
      ? 'La fecha límite debe ser posterior a la fecha de la cita.'
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
        this.toasts.ok(`Cita de ${paciente.nombre} actualizada correctamente.`);
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
      this.toasts.ok(`Cita agendada para ${paciente.nombre}.`);
      return;
    }

    if (this.dias().size === 0) {
      throw new Error('Selecciona al menos un día de la semana.');
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
        ? `Se agendaron ${n} citas. ${res.conflictos.length} fecha(s) se omitieron por conflicto de horario.`
        : `Serie de ${n} citas creada correctamente para ${paciente.nombre}.`,
    );
  }

  protected async cancelarCita(): Promise<void> {
    const cita = this.cita();
    if (!cita || this.guardando()) return;

    const ok = await this.confirm.pedir({
      titulo: '¿Cancelar esta cita médica?',
      mensaje:
        `La cita se marcará como cancelada y su horario volverá a estar disponible en la agenda. ` +
        (cita.extendedProps.serieId
          ? 'Solo afectará a esta fecha específica.'
          : 'El registro se conserva en el historial.'),
      textoOk: 'Sí, cancelar cita',
      peligro: true,
    });
    if (!ok) return;

    this.guardando.set(true);
    try {
      await this.api.cancelarCita(cita.extendedProps.citaId);
      this.toasts.ok('Cita cancelada correctamente.');
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
          ? `Conflicto de horario: ocupado por ${d.paciente} (${new Date(d.inicio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}).`
          : 'El horario seleccionado ya se encuentra ocupado.';
      }
      if (e.status === 403) return 'No dispones de permisos para agendar con este médico.';
      if (e.status === 0) return 'Sin conexión con el servidor.';
      return 'No se pudo guardar la cita. Intenta de nuevo.';
    }
    return e instanceof Error ? e.message : 'No se pudo guardar la cita.';
  }
}
