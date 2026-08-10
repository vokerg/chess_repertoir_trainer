import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { Clerk } from '@clerk/clerk-js';
import { AuthService } from './auth.service';

describe('AuthService Clerk mounts', () => {
  let auth: AuthService;
  let clerk: jasmine.SpyObj<Clerk>;

  beforeEach(() => {
    clerk = jasmine.createSpyObj<Clerk>(
      'Clerk',
      ['load', 'addListener', 'mountSignIn', 'mountSignUp'],
      { user: null, session: null },
    );
    clerk.load.and.resolveTo();

    TestBed.configureTestingModule({ providers: [provideHttpClient(), AuthService] });
    auth = TestBed.inject(AuthService);
    Object.defineProperty(auth, 'clerk', { value: clerk });
  });

  it('configures the Angular return URL as the sign-in fallback', async () => {
    const node = document.createElement('div');

    await auth.mountSignIn(node, '/games');

    expect(clerk.mountSignIn).toHaveBeenCalledOnceWith(node, { fallbackRedirectUrl: '/games' });
  });

  it('configures the Angular return URL as the sign-up fallback', async () => {
    const node = document.createElement('div');

    await auth.mountSignUp(node, '/library');

    expect(clerk.mountSignUp).toHaveBeenCalledOnceWith(node, { fallbackRedirectUrl: '/library' });
  });

  it('does not mount Clerk when initialization reports an authenticated user', async () => {
    Object.defineProperty(clerk, 'user', { value: {} });
    const node = document.createElement('div');

    await auth.mountSignIn(node, '/home');
    await auth.mountSignUp(node, '/home');

    expect(clerk.mountSignIn).not.toHaveBeenCalled();
    expect(clerk.mountSignUp).not.toHaveBeenCalled();
  });
});
