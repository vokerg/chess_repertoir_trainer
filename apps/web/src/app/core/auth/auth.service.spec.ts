import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Clerk } from '@clerk/clerk-js';
import { appConfig } from '../../app-config';
import { AuthService, type CurrentAppUserResponse } from './auth.service';

describe('AuthService Clerk mounts', () => {
  let auth: AuthService;
  let clerk: jasmine.SpyObj<Clerk>;
  let http: HttpTestingController;
  let currentUser: Clerk['user'];
  let currentSession: Clerk['session'];

  beforeEach(() => {
    currentUser = null;
    currentSession = null;
    clerk = jasmine.createSpyObj<Clerk>(
      'Clerk',
      ['load', 'addListener', 'mountSignIn', 'mountSignUp'],
    );
    Object.defineProperties(clerk, {
      user: { configurable: true, get: () => currentUser },
      session: { configurable: true, get: () => currentSession },
    });
    clerk.load.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    Object.defineProperty(auth, 'clerk', { value: clerk });
  });

  afterEach(() => http.verify());

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
    currentUser = {} as NonNullable<Clerk['user']>;
    const node = document.createElement('div');

    await auth.mountSignIn(node, '/home');
    await auth.mountSignUp(node, '/home');

    expect(clerk.mountSignIn).not.toHaveBeenCalled();
    expect(clerk.mountSignUp).not.toHaveBeenCalled();
  });

  it('ignores a stale current-user resolution after the Clerk session changes', async () => {
    currentSession = fakeSession('session-a', 'token-a');
    const first = resolveAppUser(auth, 'session-a');
    await Promise.resolve();
    const firstRequest = http.expectOne((request) =>
      request.url === `${appConfig.apiBaseUrl}/me`
      && request.headers.get('Authorization') === 'Bearer token-a',
    );

    currentSession = fakeSession('session-b', 'token-b');
    const second = resolveAppUser(auth, 'session-b');
    await Promise.resolve();
    const secondRequest = http.expectOne((request) =>
      request.url === `${appConfig.apiBaseUrl}/me`
      && request.headers.get('Authorization') === 'Bearer token-b',
    );

    secondRequest.flush(currentUserResponse(8, 'subject-b'));
    await second;
    expect(auth.resolvedAppSession()?.appUser.user.id).toBe(8);
    expect(auth.resolvedAppSession()?.generation).toBe(1);

    firstRequest.flush(currentUserResponse(7, 'subject-a'));
    await first;
    expect(auth.resolvedAppSession()?.appUser.user.id).toBe(8);
    expect(auth.resolvedAppSession()?.generation).toBe(1);
  });
});

function fakeSession(id: string, token: string): NonNullable<Clerk['session']> {
  return {
    id,
    getToken: async () => token,
  } as unknown as NonNullable<Clerk['session']>;
}

function resolveAppUser(auth: AuthService, sessionId: string): Promise<void> {
  return (auth as unknown as {
    resolveAppUserOnce(value: string): Promise<void>;
  }).resolveAppUserOnce(sessionId);
}

function currentUserResponse(userId: number, externalSubject: string): CurrentAppUserResponse {
  return {
    user: {
      id: userId,
      displayName: null,
      authProvider: 'clerk',
      authSubject: externalSubject,
      email: null,
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    },
    auth: {
      userId,
      provider: 'clerk',
      externalSubject,
    },
  };
}
