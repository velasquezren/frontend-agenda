export type EstadoCita = 'programada' | 'cumplida' | 'cancelada' | 'no_asistio';

export interface Medico {
  id: number;
  nombre: string;
  color: string;
  horario_ref: string | null;
}

export interface Paciente {
  id: number;
  nombre: string;
  telefono: string | null;
  notas: string | null;
}

export interface Licenciada {
  id: number;
  nombre: string;
  usuario: string;
}

/** Lo que el API cuelga de `extendedProps` de cada evento de FullCalendar. */
export interface CitaProps {
  citaId: number;
  medicoId: number;
  pacienteId: number;
  pacienteNombre: string;
  licenciadaId: number;
  serieId: number | null;
  estado: EstadoCita;
  notas: string | null;
}

/** Evento en formato FullCalendar, tal cual lo devuelve el API. */
export interface CitaEvento {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  extendedProps: CitaProps;
}

export interface CitaNueva {
  medico_id: number;
  paciente_id: number;
  inicio: string;
  fin: string;
  notas?: string | null;
}

export interface CitaCambio {
  inicio?: string;
  fin?: string;
  paciente_id?: number;
  estado?: EstadoCita;
  notas?: string | null;
}

export interface SerieNueva {
  medico_id: number;
  paciente_id: number;
  dias_semana: number[];
  hora_inicio: string;
  hora_fin: string;
  fecha_desde: string;
  fecha_hasta: string;
  notas?: string | null;
}

export interface SerieResultado {
  serie_id: number;
  creadas: CitaEvento[];
  conflictos: string[];
}

/** Cuerpo del 409 que devuelve el API cuando el horario ya esta ocupado. */
export interface ConflictoDetalle {
  mensaje: string;
  cita_id: number;
  inicio: string;
  fin: string;
  paciente: string;
}
