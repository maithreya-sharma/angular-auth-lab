import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, switchMap, tap } from 'rxjs';

const API = 'http://localhost:3000';

export interface User { sub: string; email: string; role: 'user' | 'admin'; exp: number; }
interface LoginResponse { accessToken: string; refreshToken: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private accessToken = signal<string | null>(null);
  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  token = () => this.accessToken();

  login(email: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>(`${API}/login`, { email, password }).pipe(
      tap(({ accessToken, refreshToken }) => {
        this.accessToken.set(accessToken);          // memory: never written to storage
        localStorage.setItem('rt', refreshToken);   // survives reload, so we can refresh on startup
      }),
      switchMap(() => this.loadMe()),               // then ask the API who we are
    );
  }

  loadMe(): Observable<User> {
    return this.http.get<User>(`${API}/me`).pipe(   // the interceptor adds the Bearer header
      tap(user => this.currentUser.set(user)),      // isLoggedIn becomes true automatically
    );
  }

  logout(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);                     // isLoggedIn becomes false
    localStorage.removeItem('rt');
    this.router.navigate(['/login']);
  }

  private refreshInFlight: Observable<string> | null = null;
  refresh(): Observable<string> {
    return (this.refreshInFlight ??= this.http.post<{ accessToken: string }>(
        `${API}/refresh`, { refreshToken: localStorage.getItem('rt') }
      ).pipe(
        map(r => r.accessToken), tap(t => this.accessToken.set(t)),
        finalize(() => (this.refreshInFlight = null)),         // allow the next refresh later
        shareReplay(1)                                         // concurrent 401s share ONE call
      )                                        
    )                                       
  }
}