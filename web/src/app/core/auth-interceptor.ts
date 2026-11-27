import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (req.url.endsWith('/login') || req.url.endsWith('/refresh')) return next(req); // no loop
  const withToken = (t: string | null) =>
    t ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req;
  return next(withToken(auth.token())).pipe(catchError(err => {
    if (err.status !== 401) return throwError(() => err);            // only handle 401
    return auth.refresh().pipe(
      switchMap(t => next(withToken(t))),                            // retry ONCE with the new token
      catchError(e => { auth.logout(); return throwError(() => e); }));
  }));
};
