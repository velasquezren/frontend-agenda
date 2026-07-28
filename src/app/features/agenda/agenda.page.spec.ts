import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CalendarApi } from 'fullcalendar';

import { API_BASE } from '../../core/api-config';
import { Medico } from '../../core/models';
import { AgendaPage } from './agenda.page';

const MEDICOS: Medico[] = [
  { id: 1, nombre: 'Dr. Uno', color: '#4f46e5', horario_ref: null },
];

describe('AgendaPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  /** Monta la página y deja resueltos los médicos y la primera carga de citas. */
  async function montar() {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();

    http.expectOne(`${API_BASE}/medicos`).flush(MEDICOS);
    await fixture.whenStable();

    // El calendario pide sus eventos al montarse.
    for (const req of http.match((r) => r.url === `${API_BASE}/citas`)) {
      req.flush([]);
    }
    await fixture.whenStable();
    return fixture;
  }

  it('al guardar una cita vuelve a pedir las citas al servidor', async () => {
    const fixture = await montar();

    // Esto es lo que hace `(guardado)="refrescar()"` cuando el diálogo guarda.
    (fixture.componentInstance as unknown as { refrescar: () => void }).refrescar();
    await fixture.whenStable();

    const recargas = http.match((r) => r.url === `${API_BASE}/citas`);
    expect(recargas.length).toBeGreaterThan(0);
    recargas.forEach((r) => r.flush([]));
  });

  it('el camino real: abrir el diálogo, guardar y que el calendario se recargue', async () => {
    const fixture = await montar();
    const page = fixture.componentInstance as unknown as {
      abrirNueva: (i: Date, f: Date) => void;
    };

    // Como si el usuario arrastrara sobre un hueco del calendario.
    page.abrirNueva(new Date(2026, 7, 5, 10, 0), new Date(2026, 7, 5, 10, 30));
    await fixture.whenStable();

    const dialogo = fixture.nativeElement.querySelector('app-cita-dialog');
    expect(dialogo).not.toBeNull();

    // Elegir paciente creándolo al vuelo (evita la carrera del debounce de búsqueda).
    const buscador = fixture.nativeElement.querySelector('#cita-paciente') as HTMLInputElement;
    buscador.value = 'Ana Pérez';
    buscador.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const opciones = fixture.nativeElement.querySelectorAll('[role="option"] button');
    (opciones[opciones.length - 1] as HTMLElement).click(); // «Crear …»
    await fixture.whenStable();

    http
      .expectOne((r) => r.method === 'POST' && r.url === `${API_BASE}/pacientes`)
      .flush({ id: 3, nombre: 'Ana Pérez', telefono: null, notas: null });
    await fixture.whenStable();

    // Guardar.
    (fixture.nativeElement.querySelector('#form-cita') as HTMLFormElement).requestSubmit();
    await fixture.whenStable();

    const post = http.expectOne((r) => r.method === 'POST' && r.url === `${API_BASE}/citas`);
    post.flush({
      id: '99',
      title: 'Ana Pérez',
      start: '2026-08-05T10:00:00',
      end: '2026-08-05T10:30:00',
      color: '#4f46e5',
      extendedProps: {
        citaId: 99,
        medicoId: 1,
        pacienteId: 3,
        pacienteNombre: 'Ana Pérez',
        licenciadaId: 1,
        serieId: null,
        estado: 'programada',
        notas: null,
      },
    });
    await fixture.whenStable();
    await fixture.whenStable();

    // Lo que el usuario dice que no pasa: que la cita quede pintada sin recargar.
    const cal = (
      fixture.componentInstance as unknown as {
        calendario: () => { getApi: () => CalendarApi } | undefined;
      }
    ).calendario();
    const evento = cal!.getApi().getEventById('99');

    expect(evento).not.toBeNull();
    expect(evento!.title).toBe('Ana Pérez');

    // La búsqueda con debounce puede haberse disparado; que no ensucie el verify.
    http.match((r) => r.url === `${API_BASE}/pacientes`).forEach((r) => r.flush([]));
    http.match((r) => r.url === `${API_BASE}/citas`).forEach((r) => r.flush([]));
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));
});
