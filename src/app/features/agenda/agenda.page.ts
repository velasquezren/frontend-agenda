import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions,
  DateSelectInfo,
  DatesSetInfo,
  EventClickInfo,
  EventDropInfo,
  EventInput,
  EventResizeDoneInfo,
  EventSourceFuncInfo,
} from 'fullcalendar';
import interactionPlugin from 'fullcalendar/interaction';
import esLocale from 'fullcalendar/locales/es';
import classicTheme from 'fullcalendar/themes/classic';
import timeGridPlugin from 'fullcalendar/timegrid';

import { ApiService, aLocalISO } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CitaEvento, ConflictoDetalle, Medico } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Btn } from '../../ui/button';
import { Logo } from '../../ui/logo';
import { Tab, Tabs } from '../../ui/tabs';
import { CitaDialog, RangoInicial } from './cita-dialog';
import { ESTADOS } from './estado';

/** Id de la pestaña que superpone las agendas de todos los médicos. */
const TODOS = 'todos';

/**
 * Franja horaria que dibuja el calendario. Es solo el encuadre visual: el
 * servidor sigue aceptando citas fuera de ella, pero no se verán en la rejilla.
 */
const HORA_INICIO = 9;
const HORA_FIN = 19;

type Vista = 'timeGridWeek' | 'timeGridDay';

@Component({
  selector: 'app-agenda',
  imports: [FullCalendarModule, CitaDialog, Btn, Tabs, Logo],
  template: `
    <div class="min-h-dvh bg-slate-50">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
          <div class="flex items-center gap-2.5">
            <app-logo [tamano]="26" class="text-marca-600" />
            <h1 class="text-sm font-semibold tracking-tight text-slate-900">Agenda</h1>
          </div>

          <div class="flex items-center gap-3">
            @if (auth.lic(); as lic) {
              <span class="hidden text-sm text-slate-500 sm:inline">{{ lic.nombre }}</span>
            }
            <button type="button" appBtn="texto" tamano="sm" (click)="auth.logout()">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-5">
        @if (cargando()) {
          <div class="space-y-4" aria-busy="true" aria-label="Cargando agenda">
            <div class="h-8 w-64 animate-pulse rounded bg-slate-200"></div>
            <div class="h-[28rem] animate-pulse rounded-lg bg-slate-200"></div>
          </div>
        } @else if (medicos().length === 0) {
          <div class="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h2 class="text-sm font-semibold text-slate-900">Sin médicos asignados</h2>
            <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Tu usuario todavía no está habilitado para agendar con ningún médico. Pide que te
              asignen al menos uno.
            </p>
          </div>
        } @else {
          <app-tabs [tabs]="tabs()" [(seleccionado)]="tabSel" etiquetaLista="Médicos" />

          <div class="mt-4 mb-3 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="inline-flex overflow-hidden rounded-md border border-slate-300">
                <button
                  type="button"
                  class="flex size-9 items-center justify-center bg-white text-slate-600
                         hover:bg-slate-50"
                  aria-label="Periodo anterior"
                  (click)="navegar('prev')"
                >
                  <svg class="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M12 4l-6 6 6 6"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="flex size-9 items-center justify-center border-l border-slate-300 bg-white
                         text-slate-600 hover:bg-slate-50"
                  aria-label="Periodo siguiente"
                  (click)="navegar('next')"
                >
                  <svg class="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M8 4l6 6-6 6"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <button type="button" appBtn="suave" (click)="navegar('today')">Hoy</button>

              <h2 class="ml-1 text-sm font-medium text-slate-900 first-letter:uppercase">
                {{ tituloVista() }}
              </h2>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  class="size-3.5 accent-slate-900"
                  [checked]="verCanceladas()"
                  (change)="cambiarCanceladas($any($event.target).checked)"
                />
                Ver canceladas
              </label>

              <div
                class="inline-flex overflow-hidden rounded-md border border-slate-300"
                role="group"
                aria-label="Vista"
              >
                @for (v of VISTAS; track v.id; let primero = $first) {
                  <button
                    type="button"
                    class="h-9 px-3 text-sm"
                    [class]="
                      (vista() === v.id
                        ? 'bg-slate-900 font-medium text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50') +
                      (primero ? '' : ' border-l border-slate-300')
                    "
                    [attr.aria-pressed]="vista() === v.id"
                    (click)="cambiarVista(v.id)"
                  >
                    {{ v.texto }}
                  </button>
                }
              </div>

              <button
                type="button"
                appBtn
                [disabled]="modoTodos()"
                [title]="modoTodos() ? 'Elige un médico para agendar' : ''"
                (click)="nuevaCitaRapida()"
              >
                Nueva cita
              </button>
            </div>
          </div>

          <section
            [id]="'panel-' + tabSel()"
            role="tabpanel"
            [attr.aria-labelledby]="'tab-' + tabSel()"
            class="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"
          >
            @if (modoTodos()) {
              <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <span class="text-slate-500">Vista combinada, solo lectura</span>
                @for (m of medicos(); track m.id) {
                  <span class="flex items-center gap-1.5 text-slate-600">
                    <span
                      class="size-2 rounded-full"
                      [style.background-color]="m.color"
                      aria-hidden="true"
                    ></span>
                    {{ m.nombre }}
                  </span>
                }
              </div>
            } @else if (medicoSel()?.horario_ref; as horario) {
              <p class="mb-3 text-xs text-slate-500">
                Horario de referencia: {{ horario }} · se puede agendar fuera de él
              </p>
            }

            <full-calendar [options]="opciones" />
          </section>

          @if (medicoDialogo(); as m) {
            <app-cita-dialog
              [abierto]="dialogoAbierto()"
              [medico]="m"
              [cita]="citaSel()"
              [rango]="rangoSel()"
              (cerrar)="cerrarDialogo()"
              (guardado)="refrescar()"
            />
          }
        }
      </main>
    </div>
  `,
})
export class AgendaPage {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  protected readonly auth = inject(AuthService);

  private readonly calendario = viewChild(FullCalendarComponent);

  protected readonly medicos = signal<Medico[]>([]);
  protected readonly tabSel = signal('');
  protected readonly cargando = signal(true);
  protected readonly verCanceladas = signal(false);
  protected readonly vista = signal<Vista>('timeGridWeek');
  protected readonly tituloVista = signal('');

  protected readonly dialogoAbierto = signal(false);
  protected readonly citaSel = signal<CitaEvento | null>(null);
  protected readonly rangoSel = signal<RangoInicial | null>(null);

  protected readonly modoTodos = computed(() => this.tabSel() === TODOS);

  protected readonly medicoSel = computed(
    () => this.medicos().find((m) => String(m.id) === this.tabSel()) ?? null,
  );

  /** En la vista combinada el diálogo usa el médico dueño de la cita abierta. */
  protected readonly medicoDialogo = computed(() => {
    const cita = this.citaSel();
    if (cita) {
      return this.medicos().find((m) => m.id === cita.extendedProps.medicoId) ?? null;
    }
    return this.medicoSel();
  });

  protected readonly tabs = computed<Tab[]>(() => {
    const base = this.medicos().map((m) => ({
      id: String(m.id),
      etiqueta: m.nombre,
      color: m.color,
    }));
    return base.length > 1 ? [...base, { id: TODOS, etiqueta: 'Todos' }] : base;
  });

  protected readonly VISTAS: { id: Vista; texto: string }[] = [
    { id: 'timeGridWeek', texto: 'Semana' },
    { id: 'timeGridDay', texto: 'Día' },
  ];

  protected readonly opciones: CalendarOptions = {
    plugins: [timeGridPlugin, interactionPlugin, classicTheme],
    initialView: 'timeGridWeek',
    locale: esLocale,
    firstDay: 1,
    allDaySlot: false,
    slotMinTime: `${HORA_INICIO}:00:00`,
    slotMaxTime: `${HORA_FIN}:00:00`,
    slotDuration: '00:30:00',
    expandRows: true,
    height: 'auto',
    nowIndicator: true,
    editable: true,
    eventResizableFromStart: true,
    selectable: true,
    selectMirror: true,
    // Refuerzo visual: la regla dura la impone el servidor con un 409.
    eventOverlap: false,
    selectOverlap: false,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
    // La barra de navegación es nuestra, para que use los mismos botones que
    // el resto de la app en vez de los del tema.
    headerToolbar: false,
    datesSet: (info: DatesSetInfo) => this.tituloVista.set(info.view.title),
    events: (info: EventSourceFuncInfo) => this.cargarEventos(info),
    eventClass: (info) =>
      ESTADOS[(info.event.extendedProps as CitaEvento['extendedProps']).estado].clase,
    select: (info: DateSelectInfo) => this.abrirNueva(info.start, info.end),
    eventClick: (info: EventClickInfo) => this.abrirEdicion(info),
    eventDrop: (info: EventDropInfo) => void this.mover(info),
    eventResize: (info: EventResizeDoneInfo) => void this.mover(info),
  };

  /** El calendario ya carga solo al montarse; no hay que pedirle un refetch extra. */
  private primerAjuste = true;

  constructor() {
    void this.cargarMedicos();

    // Cambiar de pestaña recarga las citas. Además, la vista combinada es de
    // solo lectura: sin arrastrar ni seleccionar, y permitiendo el solape
    // visual (dos médicos distintos sí pueden coincidir en el mismo hueco).
    effect(() => {
      const todos = this.modoTodos();
      this.tabSel();
      const api = this.calendario()?.getApi();
      if (!api) return;

      api.setOption('editable', !todos);
      api.setOption('selectable', !todos);
      api.setOption('eventOverlap', todos);
      api.setOption('selectOverlap', todos);

      if (this.primerAjuste) {
        this.primerAjuste = false;
      } else {
        api.refetchEvents();
      }
    });
  }

  private async cargarMedicos(): Promise<void> {
    try {
      const medicos = await this.api.medicos();
      this.medicos.set(medicos);
      this.tabSel.set(medicos[0] ? String(medicos[0].id) : '');
    } catch {
      this.toasts.error('No se pudieron cargar los médicos.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarEventos(info: EventSourceFuncInfo): Promise<EventInput[]> {
    const medico = this.medicoSel();
    const objetivo = this.modoTodos() ? this.medicos() : medico ? [medico] : [];
    if (objetivo.length === 0) return [];

    try {
      const porMedico = await Promise.all(
        objetivo.map((m) =>
          this.api.citas(m.id, info.start, info.end, this.verCanceladas()),
        ),
      );
      return porMedico.flat() as EventInput[];
    } catch {
      this.toasts.error('No se pudieron cargar las citas.');
      return [];
    }
  }

  protected navegar(accion: 'prev' | 'next' | 'today'): void {
    this.calendario()?.getApi()[accion]();
  }

  protected cambiarVista(v: Vista): void {
    this.vista.set(v);
    this.calendario()?.getApi().changeView(v);
  }

  protected cambiarCanceladas(valor: boolean): void {
    this.verCanceladas.set(valor);
    this.refrescar();
  }

  protected refrescar(): void {
    this.calendario()?.getApi().refetchEvents();
  }

  /**
   * Botón "Nueva cita": propone la próxima hora en punto del día que se está
   * viendo, dentro de la franja visible del calendario.
   */
  protected nuevaCitaRapida(): void {
    const api = this.calendario()?.getApi();
    const inicio = new Date(api ? api.getDate() : new Date());
    const siguiente = new Date().getHours() + 1;
    const dentroDeLaFranja = siguiente >= HORA_INICIO && siguiente < HORA_FIN;
    inicio.setHours(dentroDeLaFranja ? siguiente : HORA_INICIO, 0, 0, 0);
    this.abrirNueva(inicio, new Date(inicio.getTime() + 30 * 60000));
  }

  protected abrirNueva(inicio: Date, fin: Date): void {
    if (this.modoTodos()) return;
    this.citaSel.set(null);
    this.rangoSel.set({ inicio, fin });
    this.dialogoAbierto.set(true);
  }

  protected abrirEdicion(info: EventClickInfo): void {
    const e = info.event;
    const props = e.extendedProps as CitaEvento['extendedProps'];
    this.rangoSel.set(null);
    this.citaSel.set({
      id: e.id,
      title: e.title,
      start: aLocalISO(e.start!),
      end: aLocalISO(e.end!),
      color: this.medicos().find((m) => m.id === props.medicoId)?.color ?? '',
      extendedProps: props,
    });
    this.dialogoAbierto.set(true);
  }

  protected cerrarDialogo(): void {
    this.dialogoAbierto.set(false);
    this.citaSel.set(null);
    this.rangoSel.set(null);
  }

  /** Arrastrar o redimensionar: PATCH y, si choca (409), se revierte. */
  private async mover(info: EventDropInfo | EventResizeDoneInfo): Promise<void> {
    const e = info.event;
    const citaId = (e.extendedProps as CitaEvento['extendedProps']).citaId;
    try {
      await this.api.editarCita(citaId, {
        inicio: aLocalISO(e.start!),
        fin: aLocalISO(e.end!),
      });
      this.toasts.ok('Cita movida.');
    } catch (err) {
      info.revert();
      if (err instanceof HttpErrorResponse && err.status === 409) {
        const d = err.error?.detail as ConflictoDetalle | undefined;
        this.toasts.error(
          d
            ? `Ese horario ya está ocupado por ${d.paciente}.`
            : 'Ese horario ya está ocupado.',
        );
      } else {
        this.toasts.error('No se pudo mover la cita.');
      }
    }
  }
}
