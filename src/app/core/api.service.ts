import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE } from './api-config';
import {
  CitaCambio,
  CitaEvento,
  CitaNueva,
  Medico,
  Paciente,
  SerieNueva,
  SerieResultado,
} from './models';

/** Fecha -> "2026-08-03T09:00:00" en hora local (sin sufijo Z). */
export function aLocalISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

@Service()
export class ApiService {
  private readonly http = inject(HttpClient);

  medicos(): Promise<Medico[]> {
    return firstValueFrom(this.http.get<Medico[]>(`${API_BASE}/medicos`));
  }

  pacientes(q: string): Promise<Paciente[]> {
    return firstValueFrom(
      this.http.get<Paciente[]>(`${API_BASE}/pacientes`, {
        params: new HttpParams().set('q', q),
      }),
    );
  }

  crearPaciente(nombre: string, telefono?: string): Promise<Paciente> {
    return firstValueFrom(
      this.http.post<Paciente>(`${API_BASE}/pacientes`, {
        nombre,
        telefono: telefono || null,
      }),
    );
  }

  citas(
    medicoId: number,
    desde: Date,
    hasta: Date,
    incluirCanceladas = false,
  ): Promise<CitaEvento[]> {
    return firstValueFrom(
      this.http.get<CitaEvento[]>(`${API_BASE}/citas`, {
        params: new HttpParams()
          .set('medico_id', medicoId)
          .set('desde', aLocalISO(desde))
          .set('hasta', aLocalISO(hasta))
          .set('incluir_canceladas', incluirCanceladas),
      }),
    );
  }

  crearCita(datos: CitaNueva): Promise<CitaEvento> {
    return firstValueFrom(this.http.post<CitaEvento>(`${API_BASE}/citas`, datos));
  }

  editarCita(id: number, cambios: CitaCambio): Promise<CitaEvento> {
    return firstValueFrom(
      this.http.patch<CitaEvento>(`${API_BASE}/citas/${id}`, cambios),
    );
  }

  cancelarCita(id: number): Promise<CitaEvento> {
    return firstValueFrom(this.http.delete<CitaEvento>(`${API_BASE}/citas/${id}`));
  }

  crearSerie(datos: SerieNueva): Promise<SerieResultado> {
    return firstValueFrom(
      this.http.post<SerieResultado>(`${API_BASE}/series`, datos),
    );
  }
}
