/** Utilidades de fecha/hora de la agenda. Todo en hora local, sin zonas. */

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Date -> "2026-08-03" */
export function fechaISO(d: Date): string {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

/** Date -> "09:30" */
export function horaHM(d: Date): string {
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

/** "09:30" -> 570. Devuelve NaN si la hora no es válida. */
export function minutos(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/** ("09:30", 45) -> "10:15" */
export function sumarMinutos(hm: string, mins: number): string {
  const total = ((minutos(hm) + mins) % 1440 + 1440) % 1440;
  return `${dosDigitos(Math.floor(total / 60))}:${dosDigitos(total % 60)}`;
}

/** Día ISO de la semana: 1 = lunes … 7 = domingo. */
export function diaISO(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

/**
 * Cuántas fechas del rango (inclusive, en formato "YYYY-MM-DD") caen en alguno
 * de los días ISO indicados. Es la previsualización de una serie recurrente.
 */
export function contarOcurrencias(
  desde: string,
  hasta: string,
  dias: ReadonlySet<number>,
): number {
  if (!desde || !hasta || dias.size === 0 || hasta < desde) return 0;

  const fin = new Date(`${hasta}T00:00:00`);
  let n = 0;
  for (const d = new Date(`${desde}T00:00:00`); d <= fin; d.setDate(d.getDate() + 1)) {
    if (dias.has(diaISO(d))) n++;
  }
  return n;
}
