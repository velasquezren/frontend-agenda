import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_BASE, TOKEN_KEY } from './api-config';
import { Licenciada } from './models';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _lic = signal<Licenciada | null>(null);

  readonly token = this._token.asReadonly();
  readonly lic = this._lic.asReadonly();
  readonly autenticada = computed(() => this._token() !== null);

  async login(usuario: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ access_token: string }>(`${API_BASE}/auth/login`, {
        usuario,
        password,
      }),
    );
    localStorage.setItem(TOKEN_KEY, res.access_token);
    this._token.set(res.access_token);
    await this.cargarLic();
  }

  async cargarLic(): Promise<void> {
    if (!this._token()) return;
    this._lic.set(
      await firstValueFrom(this.http.get<Licenciada>(`${API_BASE}/auth/me`)),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this._lic.set(null);
    void this.router.navigate(['/login']);
  }
}
