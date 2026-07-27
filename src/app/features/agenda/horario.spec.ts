import {
  contarOcurrencias,
  diaISO,
  fechaISO,
  horaHM,
  minutos,
  sumarMinutos,
} from './horario';

describe('horario', () => {
  it('formatea fecha y hora locales', () => {
    const d = new Date(2026, 7, 3, 9, 5); // 3 ago 2026, 09:05
    expect(fechaISO(d)).toBe('2026-08-03');
    expect(horaHM(d)).toBe('09:05');
  });

  it('convierte y suma minutos', () => {
    expect(minutos('09:30')).toBe(570);
    expect(sumarMinutos('09:30', 45)).toBe('10:15');
    expect(sumarMinutos('23:30', 60)).toBe('00:30');
    expect(sumarMinutos('00:15', -30)).toBe('23:45');
  });

  it('usa la numeración ISO de días (domingo = 7)', () => {
    expect(diaISO(new Date(2026, 7, 3))).toBe(1); // lunes
    expect(diaISO(new Date(2026, 7, 9))).toBe(7); // domingo
  });

  describe('contarOcurrencias', () => {
    it('cuenta L-X-V en dos semanas', () => {
      expect(contarOcurrencias('2026-08-03', '2026-08-16', new Set([1, 3, 5]))).toBe(6);
    });

    it('incluye los dos extremos del rango', () => {
      expect(contarOcurrencias('2026-08-03', '2026-08-03', new Set([1]))).toBe(1);
    });

    it('devuelve 0 si falta un dato o el rango está al revés', () => {
      expect(contarOcurrencias('', '2026-08-16', new Set([1]))).toBe(0);
      expect(contarOcurrencias('2026-08-03', '', new Set([1]))).toBe(0);
      expect(contarOcurrencias('2026-08-03', '2026-08-16', new Set())).toBe(0);
      expect(contarOcurrencias('2026-08-16', '2026-08-03', new Set([1]))).toBe(0);
    });
  });
});
