import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Clerk } from '@clerk/clerk-js';
import { firstValueFrom } from 'rxjs';
import type { CurrentAppUserResponse as CurrentAppUserWireResponse } from '@chess-trainer/contracts/external-accounts';
import { appConfig } from '../../app-config';

export type AppUser = Pick<
  CurrentAppUserWireResponse['user'],
  'id' | 'displayName' | 'authProvider' | 'authSubject' | 'email' | 'createdAt' | 'updatedAt'
>;

export type AuthSummary = CurrentAppUserWireResponse['auth'];

export interface CurrentAppUserResponse {
  user: AppUser;
  auth: AuthSummary;
}

export interface ResolvedAppSession {
  appUser: CurrentAppUserResponse;
  generation: number;
}

export interface ReverificationFactor {
  id: string;
  strategy: 'password' | 'email_code' | 'phone_code';
  label: string;
  safeIdentifier: string | null;
  emailAddressId?: string;
  phoneNumberId?: string;
}

export interface ReverificationChallengeState {
  factors: readonly ReverificationFactor[];
  selectedFactor: ReverificationFactor | null;
  busy: boolean;
  error: string | null;
}

type ClerkUser = NonNullable<Clerk['user']>;
type ClerkSession = NonNullable<Clerk['session']>;
type ClerkSessionVerification = Awaited<ReturnType<ClerkSession['startVerification']>>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly clerk = appConfig.clerkPublishableKey
    ? new Clerk(appConfig.clerkPublishableKey)
    : null;
  private readonly initializedState = signal(false);
  private readonly initializingState = signal<Promise<void> | null>(null);
  private readonly clerkUserState = signal<ClerkUser | null>(null);
  private readonly appUserState = signal<CurrentAppUserResponse | null>(null);
  private readonly resolvedAppSessionState = signal<ResolvedAppSession | null>(null);
  private readonly appUserLoadingState = signal(false);
  private readonly appUserErrorState = signal<string | null>(null);
  private readonly reverificationChallengeState = signal<ReverificationChallengeState | null>(null);
  private resolvedSessionId: string | null = null;
  private sessionGeneration = 0;
  private reverificationPromise: Promise<boolean> | null = null;
  private reverificationResolver: ((result: boolean) => void) | null = null;
  private reverificationSessionId: string | null = null;

  readonly initialized = this.initializedState.asReadonly();
  readonly clerkUser = this.clerkUserState.asReadonly();
  readonly appUser = this.appUserState.asReadonly();
  readonly resolvedAppSession = this.resolvedAppSessionState.asReadonly();
  readonly appUserLoading = this.appUserLoadingState.asReadonly();
  readonly appUserError = this.appUserErrorState.asReadonly();
  readonly reverificationChallenge = this.reverificationChallengeState.asReadonly();
  readonly isDevAuth = computed(() => !this.clerk);
  readonly isSignedIn = computed(() => this.isDevAuth() || !!this.clerkUserState());
  readonly displayName = computed(() => {
    const appUser = this.appUserState()?.user;
    if (appUser?.displayName) return appUser.displayName;
    if (appUser?.email) return appUser.email;

    const clerkUser = this.clerkUserState();
    if (!clerkUser) return this.isDevAuth() ? 'Dev user' : null;
    return clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || 'Signed in';
  });

  async initialize(): Promise<void> {
    if (this.initializedState()) return;

    const inFlight = this.initializingState();
    if (inFlight) return inFlight;

    const task = this.initializeAuth();
    this.initializingState.set(task);
    try {
      await task;
    } finally {
      this.initializingState.set(null);
    }
  }

  async getToken(): Promise<string | null> {
    await this.initialize();
    return (await this.clerk?.session?.getToken()) ?? null;
  }

  async reverify(): Promise<boolean> {
    await this.initialize();
    const session = this.clerk?.session;
    if (!session) return false;
    if (this.reverificationPromise) return this.reverificationPromise;

    let resolveResult: (result: boolean) => void = () => {};
    const resultPromise = new Promise<boolean>((resolve) => {
      resolveResult = resolve;
    });
    this.reverificationPromise = resultPromise;
    this.reverificationResolver = resolveResult;
    this.reverificationSessionId = session.id;
    this.reverificationChallengeState.set({
      factors: [],
      selectedFactor: null,
      busy: true,
      error: null,
    });

    try {
      const verification = await session.startVerification({ level: 'first_factor' });
      if (this.reverificationPromise !== resultPromise) return resultPromise;

      if (verification.status === 'complete') {
        await this.completeReverification(session, resultPromise);
        return resultPromise;
      }
      if (verification.status !== 'needs_first_factor') {
        this.finishReverification(false);
        return resultPromise;
      }

      const factors = this.mapReverificationFactors(verification);
      if (factors.length === 0) {
        this.finishReverification(false);
        return resultPromise;
      }
      this.reverificationChallengeState.set({
        factors,
        selectedFactor: null,
        busy: false,
        error: null,
      });
    } catch {
      if (this.reverificationPromise === resultPromise) this.finishReverification(false);
    }

    return resultPromise;
  }

  async selectReverificationFactor(factorId: string): Promise<void> {
    const challenge = this.reverificationChallengeState();
    const factor = challenge?.factors.find((candidate) => candidate.id === factorId);
    const session = this.currentReverificationSession();
    if (!challenge || challenge.busy || !factor || !session) return;

    this.reverificationChallengeState.set({ ...challenge, busy: true, error: null });
    try {
      if (factor.strategy === 'email_code') {
        if (!factor.emailAddressId) throw new Error('Email verification identifier is missing.');
        await session.prepareFirstFactorVerification({
          strategy: 'email_code',
          emailAddressId: factor.emailAddressId,
        });
      } else if (factor.strategy === 'phone_code') {
        if (!factor.phoneNumberId) throw new Error('Phone verification identifier is missing.');
        await session.prepareFirstFactorVerification({
          strategy: 'phone_code',
          phoneNumberId: factor.phoneNumberId,
        });
      }
      const current = this.reverificationChallengeState();
      if (!current || !this.currentReverificationSession()) return;
      this.reverificationChallengeState.set({
        ...current,
        selectedFactor: factor,
        busy: false,
        error: null,
      });
    } catch {
      const current = this.reverificationChallengeState();
      if (!current) return;
      this.reverificationChallengeState.set({
        ...current,
        busy: false,
        error: 'Could not prepare that verification method. Choose another method or cancel.',
      });
    }
  }

  async submitReverification(value: string): Promise<void> {
    const challenge = this.reverificationChallengeState();
    const factor = challenge?.selectedFactor;
    const session = this.currentReverificationSession();
    if (!challenge || challenge.busy || !factor || !session || !value.trim()) return;

    this.reverificationChallengeState.set({ ...challenge, busy: true, error: null });
    let verification: ClerkSessionVerification;
    try {
      if (factor.strategy === 'password') {
        verification = await session.attemptFirstFactorVerification({
          strategy: 'password',
          password: value,
        });
      } else if (factor.strategy === 'email_code') {
        verification = await session.attemptFirstFactorVerification({
          strategy: 'email_code',
          code: value.trim(),
        });
      } else {
        verification = await session.attemptFirstFactorVerification({
          strategy: 'phone_code',
          code: value.trim(),
        });
      }
    } catch {
      const current = this.reverificationChallengeState();
      if (!current) return;
      this.reverificationChallengeState.set({
        ...current,
        busy: false,
        error: 'Verification failed. Check the credential and try again.',
      });
      return;
    }

    if (verification.status !== 'complete') {
      const current = this.reverificationChallengeState();
      if (!current) return;
      this.reverificationChallengeState.set({
        ...current,
        busy: false,
        error: 'Verification did not complete. Try again or cancel.',
      });
      return;
    }

    await this.completeReverification(session, this.reverificationPromise);
  }

  cancelReverification(): void {
    if (this.reverificationPromise) this.finishReverification(false);
  }

  async signOut(): Promise<void> {
    this.cancelReverification();
    if (!this.clerk) return;
    await this.clerk.signOut();
    this.clerkUserState.set(null);
    this.clearResolvedAppSession();
  }

  async mountSignIn(node: HTMLDivElement, fallbackRedirectUrl: string): Promise<void> {
    await this.initialize();
    if (this.isSignedIn()) return;
    this.clerk?.mountSignIn(node, { fallbackRedirectUrl });
  }

  unmountSignIn(node: HTMLDivElement): void {
    this.clerk?.unmountSignIn(node);
  }

  async mountSignUp(node: HTMLDivElement, fallbackRedirectUrl: string): Promise<void> {
    await this.initialize();
    if (this.isSignedIn()) return;
    this.clerk?.mountSignUp(node, { fallbackRedirectUrl });
  }

  unmountSignUp(node: HTMLDivElement): void {
    this.clerk?.unmountSignUp(node);
  }

  async mountUserButton(node: HTMLDivElement): Promise<void> {
    await this.initialize();
    this.clerk?.mountUserButton(node);
  }

  unmountUserButton(node: HTMLDivElement): void {
    this.clerk?.unmountUserButton(node);
  }

  private async initializeAuth(): Promise<void> {
    if (!this.clerk) {
      this.initializedState.set(true);
      await this.resolveAppUserOnce('dev');
      return;
    }

    await this.clerk.load({
      appearance: {
        variables: {
          colorPrimary: '#1f7865',
          colorForeground: '#172321',
          colorBackground: '#ffffff',
          colorInputBackground: '#f7f9f8',
          colorInputText: '#172321',
          borderRadius: '10px',
          fontFamily: 'IBM Plex Sans, Inter, system-ui, sans-serif',
        },
      },
    });
    this.syncFromClerk();
    this.clerk.addListener(() => {
      this.syncFromClerk();
      void this.resolveCurrentSession();
    });
    this.initializedState.set(true);
    await this.resolveCurrentSession();
  }

  private syncFromClerk(): void {
    this.clerkUserState.set(this.clerk?.user ?? null);
    const activeSessionId = this.clerk?.session?.id ?? null;
    if (this.reverificationSessionId && this.reverificationSessionId !== activeSessionId) {
      this.cancelReverification();
    }
    if (
      activeSessionId === null ||
      (this.resolvedSessionId !== null && this.resolvedSessionId !== activeSessionId)
    ) {
      this.clearResolvedAppSession();
    }
  }

  private async resolveCurrentSession(): Promise<void> {
    const sessionId = this.clerk?.session?.id ?? null;
    if (!sessionId) return;
    await this.resolveAppUserOnce(sessionId);
  }

  private async resolveAppUserOnce(sessionId: string): Promise<void> {
    if (this.resolvedSessionId === sessionId && this.appUserState()) return;

    const token = await this.clerk?.session?.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.appUserLoadingState.set(true);
    this.appUserErrorState.set(null);
    try {
      const currentUser = await firstValueFrom(
        this.http.get<CurrentAppUserResponse>(`${appConfig.apiBaseUrl}/me`, { headers }),
      );
      if (!this.isCurrentAuthSession(sessionId)) return;

      if (this.resolvedSessionId !== sessionId) this.sessionGeneration += 1;
      this.resolvedSessionId = sessionId;
      this.appUserState.set(currentUser);
      this.resolvedAppSessionState.set({
        appUser: currentUser,
        generation: this.sessionGeneration,
      });
    } catch (error) {
      if (!this.isCurrentAuthSession(sessionId)) return;
      this.appUserState.set(null);
      this.resolvedAppSessionState.set(null);
      this.appUserErrorState.set(error instanceof Error ? error.message : 'Unable to load user');
    } finally {
      if (this.isCurrentAuthSession(sessionId)) this.appUserLoadingState.set(false);
    }
  }

  private mapReverificationFactors(
    verification: ClerkSessionVerification,
  ): ReverificationFactor[] {
    const factors = verification.supportedFirstFactors ?? [];
    const mapped: ReverificationFactor[] = [];
    factors.forEach((factor, index) => {
      if (factor.strategy === 'password') {
        mapped.push({
          id: `password:${index}`,
          strategy: 'password',
          label: 'Password',
          safeIdentifier: null,
        });
      } else if (factor.strategy === 'email_code') {
        mapped.push({
          id: `email_code:${factor.emailAddressId}`,
          strategy: 'email_code',
          label: factor.safeIdentifier ? `Email code to ${factor.safeIdentifier}` : 'Email code',
          safeIdentifier: factor.safeIdentifier ?? null,
          emailAddressId: factor.emailAddressId,
        });
      } else if (factor.strategy === 'phone_code') {
        mapped.push({
          id: `phone_code:${factor.phoneNumberId}`,
          strategy: 'phone_code',
          label: factor.safeIdentifier ? `Text code to ${factor.safeIdentifier}` : 'Text message code',
          safeIdentifier: factor.safeIdentifier ?? null,
          phoneNumberId: factor.phoneNumberId,
        });
      }
    });
    return mapped;
  }

  private currentReverificationSession(): ClerkSession | null {
    const session = this.clerk?.session ?? null;
    if (!session || session.id !== this.reverificationSessionId) return null;
    return session;
  }

  private async completeReverification(
    session: ClerkSession,
    expectedPromise: Promise<boolean> | null,
  ): Promise<void> {
    if (!expectedPromise || this.reverificationPromise !== expectedPromise) return;
    try {
      const freshToken = await session.getToken({ skipCache: true });
      if (
        !freshToken ||
        this.reverificationPromise !== expectedPromise ||
        this.currentReverificationSession()?.id !== session.id
      ) {
        this.finishReverification(false);
        return;
      }
      this.finishReverification(true);
    } catch {
      if (this.reverificationPromise === expectedPromise) this.finishReverification(false);
    }
  }

  private finishReverification(result: boolean): void {
    const resolve = this.reverificationResolver;
    this.reverificationResolver = null;
    this.reverificationPromise = null;
    this.reverificationSessionId = null;
    this.reverificationChallengeState.set(null);
    resolve?.(result);
  }

  private clearResolvedAppSession(): void {
    this.appUserState.set(null);
    this.resolvedAppSessionState.set(null);
    this.appUserLoadingState.set(false);
    this.appUserErrorState.set(null);
    this.resolvedSessionId = null;
  }

  private isCurrentAuthSession(sessionId: string): boolean {
    if (!this.clerk) return sessionId === 'dev';
    return this.clerk.session?.id === sessionId;
  }
}
