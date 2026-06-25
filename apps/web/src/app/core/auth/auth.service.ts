import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Clerk } from '@clerk/clerk-js';
import { firstValueFrom } from 'rxjs';
import { appConfig } from '../../app-config';

export interface AppUser {
  id: number;
  displayName: string | null;
  authProvider: string | null;
  authSubject: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSummary {
  userId: number;
  provider: 'clerk' | 'dev';
  externalSubject: string;
  email?: string;
}

export interface CurrentAppUserResponse {
  user: AppUser;
  auth: AuthSummary;
}

type ClerkUser = NonNullable<Clerk['user']>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly clerk = appConfig.clerkPublishableKey ? new Clerk(appConfig.clerkPublishableKey) : null;
  private readonly initializedState = signal(false);
  private readonly initializingState = signal<Promise<void> | null>(null);
  private readonly clerkUserState = signal<ClerkUser | null>(null);
  private readonly appUserState = signal<CurrentAppUserResponse | null>(null);
  private readonly appUserLoadingState = signal(false);
  private readonly appUserErrorState = signal<string | null>(null);
  private resolvedSessionId: string | null = null;

  readonly initialized = this.initializedState.asReadonly();
  readonly clerkUser = this.clerkUserState.asReadonly();
  readonly appUser = this.appUserState.asReadonly();
  readonly appUserLoading = this.appUserLoadingState.asReadonly();
  readonly appUserError = this.appUserErrorState.asReadonly();
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

  async signOut(): Promise<void> {
    if (!this.clerk) return;
    await this.clerk.signOut();
    this.clerkUserState.set(null);
    this.appUserState.set(null);
    this.resolvedSessionId = null;
  }

  async mountSignIn(node: HTMLDivElement): Promise<void> {
    await this.initialize();
    this.clerk?.mountSignIn(node);
  }

  unmountSignIn(node: HTMLDivElement): void {
    this.clerk?.unmountSignIn(node);
  }

  async mountSignUp(node: HTMLDivElement): Promise<void> {
    await this.initialize();
    this.clerk?.mountSignUp(node);
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

    await this.clerk.load();
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
    if (!this.clerk?.session) {
      this.appUserState.set(null);
      this.resolvedSessionId = null;
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
      this.appUserState.set(currentUser);
      this.resolvedSessionId = sessionId;
    } catch (error) {
      this.appUserState.set(null);
      this.appUserErrorState.set(error instanceof Error ? error.message : 'Unable to load user');
    } finally {
      this.appUserLoadingState.set(false);
    }
  }
}
