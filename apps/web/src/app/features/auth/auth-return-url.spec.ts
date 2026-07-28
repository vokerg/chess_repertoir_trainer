import { signal, type Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPageComponent } from './login-page.component';
import { SignupPageComponent } from './signup-page.component';

describe('authentication return URL handoff', () => {
  const auth = {
    initialized: signal(false),
    isSignedIn: signal(true),
    isDevAuth: signal(true),
    appUserError: signal<string | null>(null),
    initialize: jasmine.createSpy('initialize').and.resolveTo(),
    mountSignIn: jasmine.createSpy('mountSignIn').and.resolveTo(),
    unmountSignIn: jasmine.createSpy('unmountSignIn'),
    mountSignUp: jasmine.createSpy('mountSignUp').and.resolveTo(),
    unmountSignUp: jasmine.createSpy('unmountSignUp'),
  };

  afterEach(() => TestBed.resetTestingModule());

  it('uses the requested return URL for local-development login access', async () => {
    const fixture = await createFixture(LoginPageComponent, '/games');

    const action = fixture.nativeElement.querySelector('.auth-action') as HTMLAnchorElement;
    expect(action.textContent?.trim()).toBe('Continue to application');
    expect(action.getAttribute('href')).toBe('/games');
  });

  it('uses the requested return URL for local-development signup access', async () => {
    const fixture = await createFixture(SignupPageComponent, '/opening-analysis');

    const action = fixture.nativeElement.querySelector('.auth-action') as HTMLAnchorElement;
    expect(action.textContent?.trim()).toBe('Continue to application');
    expect(action.getAttribute('href')).toBe('/opening-analysis');
  });

  async function createFixture<T>(component: Type<T>, returnUrl: string): Promise<ComponentFixture<T>> {
    auth.initialize.calls.reset();

    await TestBed.configureTestingModule({
      imports: [component],
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ returnUrl }),
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
});
