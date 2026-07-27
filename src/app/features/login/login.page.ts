import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { Btn } from '../../ui/button';
import { Field } from '../../ui/field';
import { InputCampo } from '../../ui/input';
import { Logo } from '../../ui/logo';
import { Spinner } from '../../ui/spinner';

@Component({
  selector: 'app-login',
  imports: [Btn, Field, InputCampo, Logo, Spinner],
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10">
      <div class="w-full max-w-sm">
        <div class="mb-6 flex flex-col items-center text-center">
          <app-logo [tamano]="56" etiqueta="Clínica Montalvo" class="text-marca-600" />
          <h1 class="mt-3 text-base font-semibold tracking-tight text-slate-900">Agenda</h1>
          <p class="text-sm text-slate-500">Clínica Montalvo</p>
        </div>

        <form
          class="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
          (submit)="entrar($event)"
        >
          <app-field etiqueta="Usuario" para="usuario">
            <input
              appInput
              id="usuario"
              name="usuario"
              autocomplete="username"
              required
              [invalido]="!!error()"
              [value]="usuario()"
              (input)="usuario.set($any($event.target).value)"
            />
          </app-field>

          <app-field etiqueta="Contraseña" para="password">
            <input
              appInput
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              [invalido]="!!error()"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
            />
          </app-field>

          @if (error()) {
            <p
              class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {{ error() }}
            </p>
          }

          <button type="submit" appBtn tamano="lg" class="w-full" [disabled]="cargando()">
            @if (cargando()) {
              <app-spinner />
            }
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </div>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly cargando = signal(false);

  protected async entrar(ev: Event): Promise<void> {
    ev.preventDefault();
    if (this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    try {
      await this.auth.login(this.usuario().trim(), this.password());
      await this.router.navigate(['/agenda']);
    } catch (e) {
      this.error.set(
        e instanceof HttpErrorResponse && e.status === 401
          ? 'Usuario o contraseña incorrectos.'
          : 'No se pudo conectar con el servidor.',
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
