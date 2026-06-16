import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { appConfig } from '../app-config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) return next(request);

  const auth = inject(AuthService);
  return from(auth.getToken()).pipe(
    switchMap((token) => {
      if (!token) return next(request);
      return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }),
  );
};

function isApiRequest(url: string): boolean {
  const requestUrl = new URL(url, window.location.origin);
  const apiUrl = new URL(appConfig.apiBaseUrl, window.location.origin);

  if (requestUrl.origin !== apiUrl.origin) return false;
  return requestUrl.pathname === apiUrl.pathname || requestUrl.pathname.startsWith(`${apiUrl.pathname}/`);
}
