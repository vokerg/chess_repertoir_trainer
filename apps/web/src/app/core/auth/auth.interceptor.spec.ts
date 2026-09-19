import { HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { appConfig } from '../../app-config';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getToken']);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });
  });

  it('preserves a request-bound fresh authorization token', async () => {
    const request = new HttpRequest(
      'POST',
      `${appConfig.apiBaseUrl}/admin/lifecycle`,
      {},
      {
        headers: new HttpHeaders({ Authorization: 'Bearer fresh-reverification-token' }),
      },
    );
    let forwarded!: HttpRequest<unknown>;

    await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authInterceptor(request, (nextRequest) => {
          forwarded = nextRequest;
          return of(new HttpResponse());
        }),
      ),
    );

    expect(auth.getToken).not.toHaveBeenCalled();
    expect(forwarded.headers.get('Authorization')).toBe('Bearer fresh-reverification-token');
  });

  it('adds the normal session token when a request has no explicit authorization', async () => {
    auth.getToken.and.resolveTo('normal-session-token');
    const request = new HttpRequest('GET', `${appConfig.apiBaseUrl}/me`);
    let forwarded!: HttpRequest<unknown>;

    await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authInterceptor(request, (nextRequest) => {
          forwarded = nextRequest;
          return of(new HttpResponse());
        }),
      ),
    );

    expect(auth.getToken).toHaveBeenCalledOnceWith();
    expect(forwarded.headers.get('Authorization')).toBe('Bearer normal-session-token');
  });
});
