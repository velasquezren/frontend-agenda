import { Component, computed, inject, input, output, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { CitaEvento, Medico, Paciente } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Badge } from '../../ui/badge';
import { Btn } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { Field } from '../../ui/field';
import { InputCampo } from '../../ui/input';
import { Spinner } from '../../ui/spinner';
import { ESTADOS } from './estado';
import { fechaISO } from './horario';

@Component({
  selector: 'app-reporte-dialog',
  imports: [Dialog, Btn, Field, InputCampo, Spinner, Badge],
  template: `
    <app-dialog
      [abierto]="abierto()"
      titulo="Exportar reporte de sesiones"
      descripcion="Genera reportes filtrados por médico o paciente en Excel (CSV) o PDF"
      tamano="lg"
      (cerrar)="cerrar.emit()"
    >
      <div class="space-y-5">
        <!-- Filtros del Reporte -->
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

          <app-field etiqueta="Buscar paciente (opcional)" para="rep-paciente">
            <input
              appInput
              id="rep-paciente"
              type="text"
              placeholder="Nombre del paciente..."
              [value]="filtroPaciente()"
              (input)="filtroPaciente.set($any($event.target).value)"
            />
          </app-field>

          <app-field etiqueta="Desde" para="rep-desde">
            <input
              appInput
              id="rep-desde"
              type="date"
              [value]="fechaDesde()"
              (input)="fechaDesde.set($any($event.target).value)"
            />
          </app-field>

          <app-field etiqueta="Hasta" para="rep-hasta">
            <input
              appInput
              id="rep-hasta"
              type="date"
              [value]="fechaHasta()"
              (input)="fechaHasta.set($any($event.target).value)"
            />
          </app-field>
        </div>

        <!-- Botón para Cargar / Previsualizar datos -->
        <div class="flex items-center justify-between border-t border-slate-200/80 pt-4">
          <div class="flex items-center gap-2">
            <button
              type="button"
              appBtn="suave"
              [disabled]="cargando()"
              (click)="generarVistaPrevia()"
            >
              @if (cargando()) {
                <app-spinner />
              }
              {{ cargando() ? 'Generando...' : 'Vista previa de sesiones' }}
            </button>
          </div>

          @if (citasFiltradas().length > 0) {
            <span class="text-xs font-semibold text-slate-700">
              {{ citasFiltradas().length }} sesión(es) encontradas
            </span>
          }
        </div>

        <!-- Tabla Previsualización / Resultados -->
        @if (cargado()) {
          @if (citasFiltradas().length === 0) {
            <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
              No se encontraron sesiones registradas en el rango de fechas seleccionado.
            </div>
          } @else {
            <div class="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <table class="w-full text-left text-xs">
                <thead class="sticky top-0 bg-slate-100/90 text-slate-700 backdrop-blur-sm">
                  <tr>
                    <th class="px-3 py-2 font-semibold">Fecha / Hora</th>
                    <th class="px-3 py-2 font-semibold">Paciente</th>
                    <th class="px-3 py-2 font-semibold">Médico</th>
                    <th class="px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (c of citasFiltradas(); track c.id) {
                    <tr class="hover:bg-slate-50/80">
                      <td class="px-3 py-2 whitespace-nowrap text-slate-900 font-medium">
                        {{ formatearFechaHora(c.start, c.end) }}
                      </td>
                      <td class="px-3 py-2 text-slate-700">
                        {{ c.extendedProps.pacienteNombre }}
                      </td>
                      <td class="px-3 py-2 text-slate-600">
                        {{ obtenerNombreMedico(c.extendedProps.medicoId) }}
                      </td>
                      <td class="px-3 py-2">
                        <app-badge [tono]="ESTADOS[c.extendedProps.estado].tono">
                          {{ ESTADOS[c.extendedProps.estado].texto }}
                        </app-badge>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>

      <button dialogFooter type="button" appBtn="suave" class="rounded-xl" (click)="cerrar.emit()">
        Cerrar
      </button>

      <button
        dialogFooter
        type="button"
        appBtn="suave"
        class="rounded-xl"
        [disabled]="citasFiltradas().length === 0"
        (click)="exportarPDF()"
      >
        Imprimir / PDF
      </button>

      <button
        dialogFooter
        type="button"
        appBtn
        class="rounded-xl font-semibold shadow-sm"
        [disabled]="citasFiltradas().length === 0"
        (click)="exportarExcel()"
      >
        Exportar Excel (CSV)
      </button>
    </app-dialog>
  `,
})
export class ReporteDialog {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  readonly abierto = input.required<boolean>();
  readonly medicos = input.required<Medico[]>();

  readonly cerrar = output<void>();

  protected readonly medicoId = signal('todos');
  protected readonly filtroPaciente = signal('');
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');
  protected readonly cargando = signal(false);
  protected readonly cargado = signal(false);
  protected readonly citasRaw = signal<CitaEvento[]>([]);

  protected readonly ESTADOS = ESTADOS;

  protected readonly citasFiltradas = computed(() => {
    const q = this.filtroPaciente().trim().toLowerCase();
    return this.citasRaw().filter((c) => {
      if (!q) return true;
      return c.extendedProps.pacienteNombre.toLowerCase().includes(q);
    });
  });

  constructor() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    this.fechaDesde.set(fechaISO(inicioMes));
    this.fechaHasta.set(fechaISO(finMes));
  }

  protected async generarVistaPrevia(): Promise<void> {
    if (!this.fechaDesde() || !this.fechaHasta()) {
      this.toasts.error('Selecciona las fechas de inicio y fin.');
      return;
    }

    this.cargando.set(true);
    try {
      const desde = new Date(`${this.fechaDesde()}T00:00:00`);
      const hasta = new Date(`${this.fechaHasta()}T23:59:59`);

      const medicosTarget =
        this.medicoId() === 'todos'
          ? this.medicos()
          : this.medicos().filter((m) => String(m.id) === this.medicoId());

      const res = await Promise.all(
        medicosTarget.map((m) => this.api.citas(m.id, desde, hasta, true)),
      );

      this.citasRaw.set(res.flat());
      this.cargado.set(true);
    } catch {
      this.toasts.error('No se pudieron cargar los datos para el reporte.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected obtenerNombreMedico(medicoId: number): string {
    return this.medicos().find((m) => m.id === medicoId)?.nombre ?? 'Médico';
  }

  protected formatearFechaHora(startStr: string, endStr: string): string {
    const inicio = new Date(startStr);
    const fin = new Date(endStr);
    const fecha = inicio.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaIn = inicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const horaFin = fin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} ${horaIn} - ${horaFin}`;
  }

  protected exportarExcel(): void {
    const citas = this.citasFiltradas();
    if (citas.length === 0) return;

    const encabezados = [
      'ID Sesión',
      'Fecha',
      'Hora Inicio',
      'Hora Fin',
      'Duración (min)',
      'Médico',
      'Paciente',
      'Estado',
      'Notas',
    ];

    const filas = citas.map((c) => {
      const inicio = new Date(c.start);
      const fin = new Date(c.end);
      const fecha = inicio.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const horaIn = inicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const horaFin = fin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const duracion = Math.round((fin.getTime() - inicio.getTime()) / 60000);
      const medico = this.obtenerNombreMedico(c.extendedProps.medicoId);
      const paciente = c.extendedProps.pacienteNombre;
      const estado = ESTADOS[c.extendedProps.estado].texto;
      const notas = (c.extendedProps.notas || '').replace(/"/g, '""');

      return [
        c.extendedProps.citaId,
        fecha,
        horaIn,
        horaFin,
        duracion,
        `"${medico}"`,
        `"${paciente}"`,
        `"${estado}"`,
        `"${notas}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_sesiones_${this.fechaDesde()}_al_${this.fechaHasta()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.toasts.ok('Reporte en Excel (CSV) generado con éxito.');
  }

  protected exportarPDF(): void {
    const citas = this.citasFiltradas();
    if (citas.length === 0) return;

    const ventana = window.open('', '_blank');
    if (!ventana) return;

    const total = citas.length;
    const programadas = citas.filter((c) => c.extendedProps.estado === 'programada').length;
    const cumplidas = citas.filter((c) => c.extendedProps.estado === 'cumplida').length;
    const canceladas = citas.filter((c) => c.extendedProps.estado === 'cancelada').length;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Reporte de Sesiones Médicas - Clínica Montalvo</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 16px;
            border-bottom: 3px solid #006156;
            margin-bottom: 20px;
          }
          .brand { font-size: 22px; font-weight: 800; color: #006156; tracking: -0.5px; }
          .sub-brand { font-size: 12px; color: #64748b; font-weight: 500; margin-top: 2px; }
          .doc-title { text-align: right; }
          .doc-title h2 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
          .doc-title p { margin: 3px 0 0 0; font-size: 11px; color: #64748b; }
          
          /* Métricas */
          .metrics {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
            text-align: center;
          }
          .card-val { font-size: 18px; font-weight: 700; color: #0f172a; }
          .card-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 2px; }

          /* Tabla */
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 9px 10px;
            border-bottom: 2px solid #cbd5e1;
            text-transform: uppercase;
            font-size: 9.5px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) td { background-color: #fafafa; }
          
          /* Badges */
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
          }
          .badge-programada { background: #e0e7ff; color: #3730a3; }
          .badge-cumplida { background: #d1fae5; color: #065f46; }
          .badge-cancelada { background: #fef2f2; color: #991b1b; text-decoration: line-through; }
          .badge-no_asistio { background: #fef3c7; color: #92400e; }

          .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
          }

          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Clínica Montalvo</div>
            <div class="sub-brand">Sistema de Agenda de Sesiones Médicas</div>
          </div>
          <div class="doc-title">
            <h2>Reporte de Sesiones</h2>
            <p>Período: ${this.fechaDesde()} al ${this.fechaHasta()}</p>
          </div>
        </div>

        <div class="metrics">
          <div class="card">
            <div class="card-val">${total}</div>
            <div class="card-lbl">Total Sesiones</div>
          </div>
          <div class="card">
            <div class="card-val" style="color: #3730a3;">${programadas}</div>
            <div class="card-lbl">Programadas</div>
          </div>
          <div class="card">
            <div class="card-val" style="color: #065f46;">${cumplidas}</div>
            <div class="card-lbl">Cumplidas</div>
          </div>
          <div class="card">
            <div class="card-val" style="color: #991b1b;">${canceladas}</div>
            <div class="card-lbl">Canceladas</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Fecha y Hora</th>
              <th style="width: 25%;">Paciente</th>
              <th style="width: 25%;">Médico</th>
              <th style="width: 15%;">Estado</th>
              <th style="width: 10%;">Notas</th>
            </tr>
          </thead>
          <tbody>
            ${citas
              .map((c) => {
                const inicio = new Date(c.start);
                const fin = new Date(c.end);
                const fecha = inicio.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                const horaIn = inicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const horaFin = fin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const medico = this.obtenerNombreMedico(c.extendedProps.medicoId);
                const st = c.extendedProps.estado;
                const estadoTexto = ESTADOS[st].texto;
                const badgeClass = `badge-${st}`;

                return `
                <tr>
                  <td><strong>${fecha}</strong> (${horaIn} - ${horaFin})</td>
                  <td><strong>${c.extendedProps.pacienteNombre}</strong></td>
                  <td>${medico}</td>
                  <td><span class="badge ${badgeClass}">${estadoTexto}</span></td>
                  <td>${c.extendedProps.notas || '-'}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <span>Generado automáticamente por el Sistema de Agenda de Sesiones</span>
          <span>Fecha de emisión: ${new Date().toLocaleString('es-ES')}</span>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    ventana.document.write(htmlContent);
    ventana.document.close();
  }
}
