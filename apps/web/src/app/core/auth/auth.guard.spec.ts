import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard administrator direct link', () => {
  let auth: { initialize: jasmine.Spy; isSignedIn: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = {
      initialize: jasmine.createSpy('initialize').and.resolveTo(),
      isSignedIn: jasmine.createSpy('isSignedIn').and.returnValue(false),
    };
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue({} as never);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('preserves /admin as the login return URL for an unauthenticated direct link', async () => {
    await runGuard('/admin');

    expect(router.createUrlTree).toHaveBeenCalledOnceWith(
      ['/login'],
      { queryParams: { returnUrl: '/admin' } },
    );
  });

  it('uses the normal sign-in boundary only for a signed-in direct link', async () => {
    auth.isSignedIn.and.returnValue(true);

    expect(await runGuard('/admin')).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url } as RouterStateSnapshot,
    ));
  }
});
