import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { API_BASE } from '../../core/api-config';
import { CitaEvento, Medico } from '../../core/models';
import { CitaDialog, RangoInicial } from './cita-dialog';

const MEDICO: Medico = {
  id: 1,
  nombre: 'Dr. Uno',
  color: '#4f46e5',
  horario_ref: null,
};

const CITA: CitaEvento = {
  id: '7',
  title: 'Ana Pérez',
  start: '2026-08-03T09:00:00',
  end: '2026-08-03T10:00:00',
  color: '#4f46e5',
  extendedProps: {
    citaId: 7,
    medicoId: 1,
    pacienteId: 3,
    pacienteNombre: 'Ana Pérez',
    licenciadaId: 1,
    serieId: null,
    estado: 'programada',
    notas: null,
  },
};

@Component({
  imports: [CitaDialog],
  template: `
    <app-cita-dialog
      [abierto]="true"
      [medico]="medico"
      [cita]="cita()"
      [rango]="rango()"
      (guardado)="guardados.set(guardados() + 1)"
    />
  `,
})
class Host {
  readonly medico = MEDICO;
  readonly cita = signal<CitaEvento | null>(null);
  readonly rango = signal<RangoInicial | null>(null);
  readonly guardados = signal(0);
}

describe('CitaDialog', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function montar(cita: CitaEvento | null, rango: RangoInicial | null = null) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.cita.set(cita);
    fixture.componentInstance.rango.set(rango);
    await fixture.whenStable();
    return fixture;
  }

  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';
  const valor = (f: { nativeElement: HTMLElement }, sel: string) =>
    (f.nativeElement.querySelector(sel) as HTMLInputElement | null)?.value;

  it('precarga el rango que se seleccionó en el calendario', async () => {
    const fixture = await montar(null, {
      inicio: new Date(2026, 7, 3, 9, 0),
      fin: new Date(2026, 7, 3, 9, 30),
    });

    expect(valor(fixture, '#cita-fecha')).toBe('2026-08-03');
    expect(valor(fixture, '#cita-inicio')).toBe('09:00');
    expect(valor(fixture, '#cita-fin')).toBe('09:30');
  });

  it('en edición precarga la cita, su paciente y su estado', async () => {
    const fixture = await montar(CITA);

    expect(texto(fixture)).toContain('Editar cita');
    expect(texto(fixture)).toContain('Ana Pérez');
    // Sin picker de búsqueda: el paciente ya viene resuelto.
    expect(fixture.nativeElement.querySelector('#cita-paciente')).toBeNull();
  });

  it('exige elegir paciente antes de guardar un alta', async () => {
    const fixture = await montar(null, {
      inicio: new Date(2026, 7, 3, 9, 0),
      fin: new Date(2026, 7, 3, 9, 30),
    });

    (fixture.nativeElement.querySelector('#form-cita') as HTMLFormElement).requestSubmit();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('Elige o crea un paciente');
    http.expectNone(`${API_BASE}/citas`); // no se llamó al API
  });

  it('el PATCH manda el rango completo y avisa al padre', async () => {
    const fixture = await montar(CITA);

    (fixture.nativeElement.querySelector('#form-cita') as HTMLFormElement).requestSubmit();
    await fixture.whenStable();

    const req = http.expectOne(`${API_BASE}/citas/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toMatchObject({
      inicio: '2026-08-03T09:00:00',
      fin: '2026-08-03T10:00:00',
      paciente_id: 3,
      estado: 'programada',
    });

    req.flush(CITA);
    await fixture.whenStable();
    expect(fixture.componentInstance.guardados()).toBe(1);
  });

  it('traduce el 409 del servidor a un mensaje con el paciente que ocupa el hueco', async () => {
    const fixture = await montar(CITA);

    (fixture.nativeElement.querySelector('#form-cita') as HTMLFormElement).requestSubmit();
    await fixture.whenStable();

    http.expectOne(`${API_BASE}/citas/7`).flush(
      {
        detail: {
          mensaje: 'Ese horario ya esta ocupado',
          cita_id: 9,
          inicio: '2026-08-03T09:30:00',
          fin: '2026-08-03T10:30:00',
          paciente: 'Luis Gómez',
        },
      },
      { status: 409, statusText: 'Conflict' },
    );
    // Dos vueltas: el error pasa por el interceptor antes de llegar al catch.
    await fixture.whenStable();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('Luis Gómez');
    expect(fixture.componentInstance.guardados()).toBe(0);
  });
});
