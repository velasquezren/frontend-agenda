import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CitaEvento, EstadoCita, Medico } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Btn } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { Field } from '../../ui/field';
import { InputCampo } from '../../ui/input';
import { logoSvg } from '../../ui/logo';
import { Spinner } from '../../ui/spinner';
import { ESTADOS } from './estado';
import { fechaISO } from './horario';
import { ColumnaXlsx, construirXlsx, ValorCelda } from './xlsx';

const VERDE = '#006156';

/** Una sesión ya normalizada, lista para pintar, imprimir o exportar. */
interface Linea {
  citaId: number;
  inicio: Date;
  fin: Date;
  minutos: number;
  medico: string;
  paciente: string;
  estado: EstadoCita;
  notas: string;
}

const escapar = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const dosDig = (n: number) => String(n).padStart(2, '0');
const fechaCorta = (d: Date) => `${dosDig(d.getDate())}/${dosDig(d.getMonth() + 1)}/${d.getFullYear()}`;
const hora = (d: Date) => `${dosDig(d.getHours())}:${dosDig(d.getMinutes())}`;

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

@Component({
  selector: 'app-reporte-dialog',
  imports: [Dialog, Btn, Field, InputCampo, Spinner],
  template: `
    <app-dialog
      [abierto]="abierto()"
      titulo="Reporte de sesiones"
      descripcion="Exporta el detalle del periodo a Excel o a PDF"
      tamano="lg"
      (cerrar)="cerrar.emit()"
    >
      <div class="space-y-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <app-field etiqueta="Médico" para="rep-medico">
            <select
              appInput
              id="rep-medico"
              [value]="medicoId()"
              (change)="medicoId.set($any($event.target).value)"
            >
              <option value="todos">Todos mis médicos</option>
              @for (m of medicos(); track m.id) {
                <option [value]="m.id">{{ m.nombre }}</option>
              }
            </select>
          </app-field>

          <app-field etiqueta="Estado" para="rep-estado">
            <select
              appInput
              id="rep-estado"
              [value]="estado()"
              (change)="estado.set($any($event.target).value)"
            >
              <option value="todos">Todos los estados</option>
              @for (e of CLAVES_ESTADO; track e) {
                <option [value]="e">{{ ESTADOS[e].texto }}</option>
              }
            </select>
          </app-field>

          <app-field etiqueta="Desde" para="rep-desde">
            <input
              appInput
              id="rep-desde"
              type="date"
              [value]="desde()"
              (input)="desde.set($any($event.target).value)"
            />
          </app-field>

          <app-field etiqueta="Hasta" para="rep-hasta">
            <input
              appInput
              id="rep-hasta"
              type="date"
              [value]="hasta()"
              (input)="hasta.set($any($event.target).value)"
            />
          </app-field>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-500">Periodo</span>
          @for (a of ATAJOS; track a.id) {
            <button
              type="button"
              class="h-7 rounded-md border border-slate-300 bg-white px-2.5 text-xs
                     text-slate-600 hover:bg-slate-50"
              (click)="aplicarAtajo(a.id)"
            >
              {{ a.texto }}
            </button>
          }
        </div>

        <app-field etiqueta="Filtrar por paciente" para="rep-paciente">
          <input
            appInput
            id="rep-paciente"
            type="text"
            placeholder="Nombre del paciente"
            [value]="filtroPaciente()"
            (input)="filtroPaciente.set($any($event.target).value)"
          />
        </app-field>

        <!-- Resumen: renglones con filete, no tarjetas. -->
        <dl class="grid grid-cols-2 border-y border-slate-200 sm:grid-cols-4">
          @for (r of resumen(); track r.etiqueta) {
            <div class="border-r border-slate-200 px-3 py-2.5 last:border-r-0">
              <dt class="text-[11px] tracking-wide text-slate-500 uppercase">{{ r.etiqueta }}</dt>
              <dd class="mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">
                {{ r.valor }}
              </dd>
            </div>
          }
        </dl>

        @if (cargando()) {
          <p class="flex items-center gap-2 py-6 text-sm text-slate-500">
            <app-spinner /> Consultando sesiones…
          </p>
        } @else if (lineas().length === 0) {
          <p class="border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            No hay sesiones en este periodo con los filtros aplicados.
          </p>
        } @else {
          <div class="max-h-72 overflow-y-auto border border-slate-200">
            <table class="w-full border-collapse text-left text-xs">
              <thead class="sticky top-0 bg-slate-100 text-slate-600">
                <tr>
                  <th class="px-3 py-2 font-medium">Fecha</th>
                  <th class="px-3 py-2 font-medium">Horario</th>
                  <th class="px-3 py-2 font-medium">Paciente</th>
                  <th class="px-3 py-2 font-medium">Médico</th>
                  <th class="px-3 py-2 text-right font-medium">Min</th>
                  <th class="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (l of lineas(); track l.citaId) {
                  <tr class="border-t border-slate-100">
                    <td class="px-3 py-1.5 whitespace-nowrap tabular-nums">
                      {{ fechaCorta(l.inicio) }}
                    </td>
                    <td class="px-3 py-1.5 whitespace-nowrap text-slate-500 tabular-nums">
                      {{ hora(l.inicio) }}–{{ hora(l.fin) }}
                    </td>
                    <td class="px-3 py-1.5">{{ l.paciente }}</td>
                    <td class="px-3 py-1.5 text-slate-500">{{ l.medico }}</td>
                    <td class="px-3 py-1.5 text-right tabular-nums">{{ l.minutos }}</td>
                    <td class="px-3 py-1.5 text-slate-500">{{ ESTADOS[l.estado].texto }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <button dialogFooter type="button" appBtn="suave" (click)="cerrar.emit()">Cerrar</button>
      <button
        dialogFooter
        type="button"
        appBtn="suave"
        [disabled]="lineas().length === 0"
        (click)="exportarExcel()"
      >
        Excel (.xlsx)
      </button>
      <button
        dialogFooter
        type="button"
        appBtn
        [disabled]="lineas().length === 0"
        (click)="imprimir()"
      >
        Imprimir / PDF
      </button>
    </app-dialog>
  `,
})
export class ReporteDialog {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly abierto = input.required<boolean>();
  readonly medicos = input.required<Medico[]>();
  readonly cerrar = output<void>();

  protected readonly medicoId = signal('todos');
  protected readonly estado = signal<'todos' | EstadoCita>('todos');
  protected readonly filtroPaciente = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly cargando = signal(false);
  private readonly crudas = signal<CitaEvento[]>([]);

  protected readonly ESTADOS = ESTADOS;
  protected readonly CLAVES_ESTADO = Object.keys(ESTADOS) as EstadoCita[];
  protected readonly fechaCorta = fechaCorta;
  protected readonly hora = hora;

  protected readonly ATAJOS = [
    { id: 'semana', texto: 'Esta semana' },
    { id: 'mes', texto: 'Este mes' },
    { id: 'anterior', texto: 'Mes anterior' },
  ] as const;

  /** Sesiones ya normalizadas y filtradas por estado y paciente. */
  protected readonly lineas = computed<Linea[]>(() => {
    const q = this.filtroPaciente().trim().toLowerCase();
    const est = this.estado();

    return this.crudas()
      .map((c): Linea => {
        const inicio = new Date(c.start);
        const fin = new Date(c.end);
        return {
          citaId: c.extendedProps.citaId,
          inicio,
          fin,
          minutos: Math.round((fin.getTime() - inicio.getTime()) / 60000),
          medico:
            this.medicos().find((m) => m.id === c.extendedProps.medicoId)?.nombre ?? '—',
          paciente: c.extendedProps.pacienteNombre,
          estado: c.extendedProps.estado,
          notas: c.extendedProps.notas ?? '',
        };
      })
      .filter((l) => (est === 'todos' || l.estado === est) && (!q || l.paciente.toLowerCase().includes(q)))
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  });

  protected readonly resumen = computed(() => {
    const l = this.lineas();
    const minutos = l.reduce((n, x) => n + x.minutos, 0);
    const cumplidas = l.filter((x) => x.estado === 'cumplida').length;
    const canceladas = l.filter((x) => x.estado === 'cancelada').length;
    return [
      { etiqueta: 'Sesiones', valor: String(l.length) },
      { etiqueta: 'Horas', valor: (minutos / 60).toFixed(1).replace('.', ',') },
      { etiqueta: 'Cumplidas', valor: String(cumplidas) },
      { etiqueta: 'Canceladas', valor: String(canceladas) },
    ];
  });

  private readonly nombreMedico = computed(() =>
    this.medicoId() === 'todos'
      ? 'Todos los médicos'
      : (this.medicos().find((m) => String(m.id) === this.medicoId())?.nombre ?? '—'),
  );

  constructor() {
    this.aplicarAtajo('mes');

    // Se recarga solo: el usuario no debería tener que pulsar "vista previa".
    effect(() => {
      if (!this.abierto()) return;
      const filtros = [this.medicoId(), this.desde(), this.hasta()];
      if (!filtros[1] || !filtros[2]) return;
      void this.cargar();
    });
  }

  protected aplicarAtajo(id: (typeof this.ATAJOS)[number]['id']): void {
    const hoy = new Date();
    let ini: Date;
    let fin: Date;

    if (id === 'semana') {
      const dia = (hoy.getDay() + 6) % 7; // lunes = 0
      ini = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dia);
      fin = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
    } else if (id === 'anterior') {
      ini = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    } else {
      ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    }

    this.desde.set(fechaISO(ini));
    this.hasta.set(fechaISO(fin));
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const objetivo =
        this.medicoId() === 'todos'
          ? this.medicos()
          : this.medicos().filter((m) => String(m.id) === this.medicoId());

      const res = await Promise.all(
        objetivo.map((m) =>
          this.api.citas(
            m.id,
            new Date(`${this.desde()}T00:00:00`),
            new Date(`${this.hasta()}T23:59:59`),
            true,
          ),
        ),
      );
      this.crudas.set(res.flat());
    } catch {
      this.toasts.error('No se pudieron cargar las sesiones del periodo.');
      this.crudas.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  // ------------------------------------------------------------------ Excel

  protected exportarExcel(): void {
    const lineas = this.lineas();
    if (lineas.length === 0) return;

    const columnas: ColumnaXlsx[] = [
      { titulo: 'N.º', ancho: 6, tipo: 'numero' },
      { titulo: 'Fecha', ancho: 11, tipo: 'fecha' },
      { titulo: 'Día', ancho: 6 },
      { titulo: 'Inicio', ancho: 8, tipo: 'hora' },
      { titulo: 'Fin', ancho: 8, tipo: 'hora' },
      { titulo: 'Minutos', ancho: 9, tipo: 'numero' },
      { titulo: 'Paciente', ancho: 30 },
      { titulo: 'Médico', ancho: 22 },
      { titulo: 'Estado', ancho: 13 },
      { titulo: 'Notas', ancho: 42 },
    ];

    const filas: ValorCelda[][] = lineas.map((l) => [
      l.citaId,
      l.inicio,
      DIAS_SEMANA[l.inicio.getDay()],
      l.inicio,
      l.fin,
      l.minutos,
      l.paciente,
      l.medico,
      ESTADOS[l.estado].texto,
      l.notas,
    ]);

    const minutos = lineas.reduce((n, l) => n + l.minutos, 0);

    this.descargar(
      construirXlsx({
        hoja: 'Sesiones',
        titulo: 'Clínica Montalvo · Reporte de sesiones',
        subtitulo: this.piePeriodo(),
        columnas,
        filas,
        totales: [null, null, null, null, `${lineas.length} sesiones`, minutos, null, null, null, null],
      }),
      `sesiones_${this.desde()}_${this.hasta()}.xlsx`,
    );

    this.toasts.ok(`Excel generado con ${lineas.length} sesiones.`);
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Líneas de contexto que van tanto en el Excel como en el PDF. */
  private piePeriodo(): string[] {
    const emitido = new Date();
    return [
      `Periodo: ${fechaCorta(new Date(`${this.desde()}T00:00:00`))} al ${fechaCorta(
        new Date(`${this.hasta()}T00:00:00`),
      )}`,
      `Médico: ${this.nombreMedico()}   ·   Estado: ${
        this.estado() === 'todos' ? 'Todos' : ESTADOS[this.estado() as EstadoCita].texto
      }`,
      `Emitido el ${fechaCorta(emitido)} a las ${hora(emitido)} por ${
        this.auth.lic()?.nombre ?? '—'
      }`,
    ];
  }

  // -------------------------------------------------------------------- PDF

  protected imprimir(): void {
    const lineas = this.lineas();
    if (lineas.length === 0) return;

    const ventana = window.open('', '_blank');
    if (!ventana) {
      this.toasts.error('El navegador bloqueó la ventana. Permite las ventanas emergentes.');
      return;
    }

    const minutos = lineas.reduce((n, l) => n + l.minutos, 0);
    const [periodo, filtros, emision] = this.piePeriodo();

    const filas = lineas
      .map(
        (l, i) => `<tr>
<td class="n">${i + 1}</td>
<td class="nw">${fechaCorta(l.inicio)}</td>
<td class="dia">${DIAS_SEMANA[l.inicio.getDay()]}</td>
<td class="nw">${hora(l.inicio)}–${hora(l.fin)}</td>
<td class="n">${l.minutos}</td>
<td>${escapar(l.paciente)}</td>
<td class="tenue">${escapar(l.medico)}</td>
<td class="tenue">${ESTADOS[l.estado].texto}</td>
<td class="notas">${escapar(l.notas)}</td>
</tr>`,
      )
      .join('');

    ventana.document.write(`<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Sesiones ${this.desde()} a ${this.hasta()}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #0f172a; background: #fff;
    font: 10pt/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* --- membrete --- */
  .membrete { display: flex; align-items: flex-start; gap: 14px; }
  .membrete svg { flex: none; margin-top: 2px; }
  .marca { font-size: 13pt; font-weight: 700; letter-spacing: -.01em; }
  .sub { font-size: 9pt; color: #64748b; }
  .doc { margin-left: auto; text-align: right; }
  .doc .tipo { font-size: 11pt; font-weight: 600; }
  .filete { height: 2.5pt; background: ${VERDE}; margin: 9px 0 0; }

  /* --- ficha de parámetros --- */
  .ficha { display: flex; gap: 26px; padding: 8px 0 12px; font-size: 8.5pt; color: #475569; }
  .ficha b { color: #0f172a; font-weight: 600; }

  /* --- tabla --- */
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th {
    background: ${VERDE}; color: #fff; font-size: 8pt; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase;
    text-align: left; padding: 6px 7px; white-space: nowrap;
  }
  td { padding: 5px 7px; border-bottom: .5pt solid #e2e8f0; font-size: 9pt; vertical-align: top; }
  tr { break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .nw { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .dia { color: #64748b; }
  .tenue { color: #475569; }
  .notas { color: #475569; font-size: 8.5pt; }

  /* --- cierre --- */
  .totales {
    margin-top: 10px; padding-top: 7px; border-top: 1.5pt solid ${VERDE};
    display: flex; gap: 26px; font-size: 9pt;
  }
  .totales span b { font-size: 11pt; }
  .pie {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-top: .5pt solid #cbd5e1; padding-top: 4px;
    font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between;
  }
</style></head>
<body>
  <header class="membrete">
    ${logoSvg(VERDE, 40)}
    <div>
      <div class="marca">Clínica Montalvo</div>
      <div class="sub">Agenda de sesiones médicas</div>
    </div>
    <div class="doc">
      <div class="tipo">Reporte de sesiones</div>
      <div class="sub">${escapar(periodo.replace('Periodo: ', ''))}</div>
    </div>
  </header>
  <div class="filete"></div>

  <div class="ficha">
    <span>${escapar(filtros)}</span>
    <span>${escapar(emision)}</span>
  </div>

  <table>
    <thead><tr>
      <th>N.º</th><th>Fecha</th><th>Día</th><th>Horario</th><th>Min</th>
      <th>Paciente</th><th>Médico</th><th>Estado</th><th>Notas</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="totales">
    <span>Sesiones <b>${lineas.length}</b></span>
    <span>Tiempo total <b>${(minutos / 60).toFixed(1).replace('.', ',')} h</b></span>
    <span>Cumplidas <b>${lineas.filter((l) => l.estado === 'cumplida').length}</b></span>
    <span>Canceladas <b>${lineas.filter((l) => l.estado === 'cancelada').length}</b></span>
  </div>

  <div class="pie">
    <span>Clínica Montalvo · documento generado automáticamente</span>
    <span>${escapar(emision.replace('Emitido el ', ''))}</span>
  </div>

  <script>window.onload = function () { window.print(); };<\/script>
</body></html>`);
    ventana.document.close();
  }
}
