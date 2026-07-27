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
    <main class="relative flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div class="relative w-full max-w-sm">
        <!-- Encabezado con Logo e Identidad -->
        <div class="mb-9 flex flex-col items-center text-center">
          <div class="mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5">
            <app-logo [tamano]="36" etiqueta="Clínica Montalvo" class="text-marca-600" />
          </div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900">Agenda de Sesiones</h1>
          <p class="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Clínica Montalvo</p>
        </div>

        <!-- Formulario Ultra Minimalista (Sin contenedor boxy) -->
        <form class="space-y-4.5" (submit)="entrar($event)">
          <!-- Campo Usuario -->
          <app-field etiqueta="Usuario" para="usuario">
            <div class="relative flex items-center">
              <span class="pointer-events-none absolute left-3.5 z-10 text-slate-400">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                appInput
                id="usuario"
                name="usuario"
                autocomplete="username"
                required
                placeholder="Ingresa tu usuario"
                style="padding-left: 2.5rem;"
                [invalido]="!!error()"
                [value]="usuario()"
                (input)="usuario.set($any($event.target).value)"
              />
            </div>
          </app-field>

          <!-- Campo Contraseña -->
          <app-field etiqueta="Contraseña" para="password">
            <div class="relative flex items-center">
              <span class="pointer-events-none absolute left-3.5 z-10 text-slate-400">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                appInput
                id="password"
                name="password"
                [type]="mostrarPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                style="padding-left: 2.5rem; padding-right: 2.5rem;"
                [invalido]="!!error()"
                [value]="password()"
                (input)="password.set($any($event.target).value)"
              />
              <button
                type="button"
                (click)="mostrarPassword.set(!mostrarPassword())"
                class="absolute right-3.5 z-10 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                [attr.aria-label]="mostrarPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              >
                @if (mostrarPassword()) {
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 011.758-.163c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.692-4.692a3 3 0 00-4.243-4.243m4.242 4.242L3 3l18 18" />
                  </svg>
                } @else {
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>
          </app-field>

          <!-- Alerta de Error -->
          @if (error()) {
            <div
              class="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-800"
              role="alert"
            >
              <svg class="size-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{{ error() }}</span>
            </div>
          }

          <!-- Botón de Entrar con separación amplia -->
          <div class="pt-3">
            <button
              type="submit"
              appBtn
              tamano="lg"
              class="w-full justify-center rounded-xl shadow-sm transition-all active:scale-[0.99] font-semibold"
              [disabled]="cargando()"
            >
              @if (cargando()) {
                <app-spinner />
              }
              {{ cargando() ? 'Iniciando sesión…' : 'Iniciar Sesión' }}
            </button>
          </div>
        </form>

        <!-- Pie de página discreto -->
        <div class="mt-10 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <svg class="size-3.5 text-marca-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Conexión cifrada de alta seguridad</span>
        </div>
      </div>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = signal('');
  protected readonly password = signal('');
  protected readonly mostrarPassword = signal(false);
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
