import { signal, type Type, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPageComponent } from './login-page.component';
import { SignupPageComponent } from './signup-page.component';

interface AuthServiceStub {
  initialized: WritableSignal<boolean>;
  isSignedIn: WritableSignal<boolean>;
  isDevAuth: WritableSignal<boolean>;
  appUserError: WritableSignal<string | null>;
  initialize: jasmine.Spy;
  mountSignIn: jasmine.Spy;
  unmountSignIn: jasmine.Spy;
  mountSignUp: jasmine.Spy;
  unmountSignUp: jasmine.Spy;
}

describe('authentication return URL handoff', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('mounts sign-in with /home as the direct-login fallback', async () => {
    const { auth } = await createFixture(LoginPageComponent);

    expect(auth.mountSignIn).toHaveBeenCalledOnceWith(jasmine.any(HTMLDivElement), '/home');
  });

  it('hands a protected-route return URL to sign-in completion', async () => {
    const { auth } = await createFixture(LoginPageComponent, '/games');

    expect(auth.mountSignIn).toHaveBeenCalledOnceWith(jasmine.any(HTMLDivElement), '/games');
  });

  it('hands the Angular return URL to sign-up completion', async () => {
    const { auth } = await createFixture(SignupPageComponent, '/opening-analysis');

    expect(auth.mountSignUp).toHaveBeenCalledOnceWith(
      jasmine.any(HTMLDivElement),
      '/opening-analysis',
    );
  });

  it('mounts sign-up with /home as the direct-signup fallback', async () => {
    const { auth } = await createFixture(SignupPageComponent);

    expect(auth.mountSignUp).toHaveBeenCalledOnceWith(jasmine.any(HTMLDivElement), '/home');
  });

  it('navigates after an OAuth or redirect flow reports a signed-in session', async () => {
    const { auth, fixture, navigateByUrl } = await createFixture(LoginPageComponent, '/games');

    auth.isSignedIn.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledOnceWith('/games');
  });

  it('sends an already-authenticated direct login to /home without mounting Clerk', async () => {
    const { auth, navigateByUrl } = await createFixture(LoginPageComponent, undefined, true);

    expect(navigateByUrl).toHaveBeenCalledOnceWith('/home');
    expect(auth.mountSignIn).not.toHaveBeenCalled();
  });

  it('sends an already-authenticated signup to its return URL without mounting Clerk', async () => {
    const { auth, navigateByUrl } = await createFixture(SignupPageComponent, '/library', true);

    expect(navigateByUrl).toHaveBeenCalledOnceWith('/library');
    expect(auth.mountSignUp).not.toHaveBeenCalled();
  });

  it('preserves the requested return URL for local-development auth access', async () => {
    const { fixture } = await createFixture(LoginPageComponent, '/games', false, true);

    const action = fixture.nativeElement.querySelector('.auth-action') as HTMLAnchorElement;
    expect(action.textContent?.trim()).toBe('Continue to application');
    expect(action.getAttribute('href')).toBe('/games');
  });

  async function createFixture<T>(
    component: Type<T>,
    returnUrl?: string,
    signedIn = false,
    devAuth = false,
  ): Promise<{
    auth: AuthServiceStub;
    fixture: ComponentFixture<T>;
    navigateByUrl: jasmine.Spy;
  }> {
    const auth = createAuthStub(signedIn, devAuth);

    await TestBed.configureTestingModule({
      imports: [component],
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}),
            },
          },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    return { auth, fixture, navigateByUrl };
  }

  function createAuthStub(signedIn: boolean, devAuth: boolean): AuthServiceStub {
    const initialized = signal(false);
    const auth: AuthServiceStub = {
      initialized,
      isSignedIn: signal(signedIn),
      isDevAuth: signal(devAuth),
      appUserError: signal<string | null>(null),
      initialize: jasmine.createSpy('initialize'),
      mountSignIn: jasmine.createSpy('mountSignIn').and.resolveTo(),
      unmountSignIn: jasmine.createSpy('unmountSignIn'),
      mountSignUp: jasmine.createSpy('mountSignUp').and.resolveTo(),
      unmountSignUp: jasmine.createSpy('unmountSignUp'),
    };
    auth.initialize.and.callFake(async () => initialized.set(true));
    return auth;
  }
});
