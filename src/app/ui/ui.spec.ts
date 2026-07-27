import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Btn } from './button';
import { Dialog } from './dialog';
import { Field } from './field';
import { InputCampo } from './input';
import { Tab, Tabs } from './tabs';

describe('Btn', () => {
  @Component({
    imports: [Btn],
    template: `
      <button id="a" appBtn class="w-full">Guardar</button>
      <button id="b" appBtn="peligro" tamano="sm">Borrar</button>
    `,
  })
  class Host {}

  it('conserva las clases del template además de las suyas', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('#a') as HTMLElement;

    // Si Angular no fusionara ambas fuentes, el `w-full` se perdería.
    expect(btn.classList.contains('w-full')).toBe(true);
    expect(btn.classList.contains('bg-slate-900')).toBe(true);
  });

  it('aplica variante y tamaño', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('#b') as HTMLElement;

    expect(btn.classList.contains('text-red-700')).toBe(true);
    expect(btn.classList.contains('h-8')).toBe(true);
    expect(btn.classList.contains('bg-slate-900')).toBe(false);
  });
});

describe('Dialog', () => {
  @Component({
    imports: [Dialog],
    template: `
      <app-dialog [abierto]="abierto()" titulo="Prueba">
        <p>cuerpo</p>
        <button dialogFooter type="button">Aceptar</button>
      </app-dialog>
    `,
  })
  class Host {
    readonly abierto = signal(false);
  }

  it('conserva m-auto, que es lo que centra el modal', async () => {
    // El preflight de Tailwind pone `margin: 0` a todos los elementos, incluido
    // <dialog>, y con eso se pierde el centrado que da el navegador. Si alguien
    // quita esta clase, el modal vuelve a salir arriba a la izquierda.
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const dlg = fixture.nativeElement.querySelector('dialog') as HTMLElement;

    expect(dlg.classList.contains('m-auto')).toBe(true);
  });

  it('abre y cierra siguiendo la señal', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const dlg = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dlg.open).toBe(false);

    fixture.componentInstance.abierto.set(true);
    await fixture.whenStable();
    expect(dlg.open).toBe(true);

    fixture.componentInstance.abierto.set(false);
    await fixture.whenStable();
    expect(dlg.open).toBe(false);
  });

  it('proyecta el pie en el footer, no en el cuerpo', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.abierto.set(true);
    await fixture.whenStable();

    const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
    expect(footer.querySelector('button')?.textContent).toContain('Aceptar');
  });
});

describe('Field', () => {
  @Component({
    imports: [Field, InputCampo],
    template: `
      <app-field etiqueta="Fecha" para="f" [error]="err()" ayuda="Ayuda">
        <input appInput id="f" [invalido]="!!err()" />
      </app-field>
    `,
  })
  class Host {
    readonly err = signal('');
  }

  it('ata la etiqueta al control y muestra la ayuda', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('label')?.getAttribute('for')).toBe('f');
    expect(el.textContent).toContain('Ayuda');
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBeNull();
  });

  it('el error sustituye a la ayuda y marca el control', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.err.set('Fecha inválida');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Fecha inválida');
    expect(el.textContent).not.toContain('Ayuda');
    expect(el.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('Tabs', () => {
  @Component({
    imports: [Tabs],
    template: '<app-tabs [tabs]="tabs" [(seleccionado)]="sel" />',
  })
  class Host {
    readonly tabs: Tab[] = [
      { id: '1', etiqueta: 'Uno' },
      { id: '2', etiqueta: 'Dos' },
      { id: '3', etiqueta: 'Tres' },
    ];
    readonly sel = signal('1');
  }

  async function montar() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture;
  }

  it('solo la pestaña activa entra en el orden de tabulación', async () => {
    const fixture = await montar();
    const botones = [...fixture.nativeElement.querySelectorAll('[role="tab"]')] as HTMLElement[];

    expect(botones.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    expect(botones[0].getAttribute('aria-selected')).toBe('true');
  });

  it('las flechas mueven la selección y dan la vuelta', async () => {
    const fixture = await montar();
    const lista = fixture.nativeElement.querySelector('[role="tablist"]') as HTMLElement;

    lista.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.sel()).toBe('2');

    lista.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    lista.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.sel()).toBe('3');

    lista.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.sel()).toBe('1');
  });

  it('el clic selecciona', async () => {
    const fixture = await montar();
    const botones = [...fixture.nativeElement.querySelectorAll('[role="tab"]')] as HTMLElement[];

    botones[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sel()).toBe('3');
  });
});
