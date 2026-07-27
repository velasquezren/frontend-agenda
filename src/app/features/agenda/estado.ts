import { EstadoCita } from '../../core/models';
import { TonoBadge } from '../../ui/badge';

interface InfoEstado {
  texto: string;
  tono: TonoBadge;
  /** Clase que `eventClass` le cuelga al evento del calendario. */
  clase: string;
}

export const ESTADOS: Record<EstadoCita, InfoEstado> = {
  programada: { texto: 'Programada', tono: 'neutro', clase: '' },
  cumplida: { texto: 'Cumplida', tono: 'exito', clase: 'cita-cumplida' },
  cancelada: { texto: 'Cancelada', tono: 'error', clase: 'cita-cancelada' },
  no_asistio: { texto: 'No asistió', tono: 'aviso', clase: 'cita-no-asistio' },
};

/** Estados que la licenciada puede poner desde el diálogo de edición. */
export const ESTADOS_EDITABLES: EstadoCita[] = ['programada', 'cumplida', 'no_asistio'];
