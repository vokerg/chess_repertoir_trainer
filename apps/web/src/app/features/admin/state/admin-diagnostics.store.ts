import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  AdminMeResponse,
  AdminUserDetailResponse,
  AdminUserSummary,
  AdminUserWorkResponse,
} from '@chess-trainer/contracts/admin';
import { firstValueFrom } from 'rxjs';
import { AdminApiService } from '../data-access/admin-api.service';

export type AdminAccessState = 'idle' | 'loading' | 'ready' | 'forbidden' | 'unavailable';
export type AdminLoadState = 'idle' | 'loading' | 'ready' | 'error';

const USER_PAGE_LIMIT = 25;
const WORK_ITEM_LIMIT = 20;

@Injectable()
export class AdminDiagnosticsStore {
  private readonly api = inject(AdminApiService);
  private capabilityRequestSequence = 0;
  private userListRequestSequence = 0;
  private selectionRequestSequence = 0;

  readonly accessState = signal<AdminAccessState>('idle');
  readonly capability = signal<AdminMeResponse | null>(null);

  readonly users = signal<readonly AdminUserSummary[]>([]);
  readonly usersState = signal<AdminLoadState>('idle');
  readonly usersError = signal<string | null>(null);
  readonly currentCursor = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly pageNumber = signal(1);

  readonly selectedUserId = signal<number | null>(null);
  readonly detail = signal<AdminUserDetailResponse | null>(null);
  readonly detailState = signal<AdminLoadState>('idle');
  readonly detailError = signal<string | null>(null);
  readonly work = signal<AdminUserWorkResponse | null>(null);
  readonly workState = signal<AdminLoadState>('idle');
  readonly workError = signal<string | null>(null);

  readonly hasNextPage = computed(() => this.nextCursor() !== null);
  readonly selectionHasPartialFailure = computed(() => {
    const detailFailed = this.detailState() === 'error';
    const workFailed = this.workState() === 'error';
    return detailFailed !== workFailed;
  });

  async initialize(): Promise<void> {
    const requestSequence = ++this.capabilityRequestSequence;
    this.invalidateUserRequests();
    this.accessState.set('loading');
    this.capability.set(null);
    this.resetUsers();

    try {
      const capability = await firstValueFrom(this.api.getMe());
      if (requestSequence !== this.capabilityRequestSequence) return;

      // The API is the authorization boundary. A successful response is enough to proceed;
      // Angular does not reproduce administrator subject/claim rules locally.
      this.capability.set(capability);
      this.accessState.set('ready');
      await this.loadUsers(null, 1);
    } catch (error) {
      if (requestSequence !== this.capabilityRequestSequence) return;
      this.capability.set(null);
      this.resetUsers();
      this.accessState.set(httpStatus(error) === 403 ? 'forbidden' : 'unavailable');
    }
  }

  async refresh(): Promise<void> {
    await this.initialize();
  }

  async retryUsers(): Promise<void> {
    if (this.accessState() !== 'ready') return;
    await this.loadUsers(this.currentCursor(), this.pageNumber());
  }

  async nextUsersPage(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.accessState() !== 'ready') return;
    await this.loadUsers(cursor, this.pageNumber() + 1);
  }

  async selectUser(userId: number): Promise<void> {
    if (this.accessState() !== 'ready') return;

    const requestSequence = ++this.selectionRequestSequence;
    this.selectedUserId.set(userId);
    this.detail.set(null);
    this.work.set(null);
    this.detailError.set(null);
    this.workError.set(null);
    this.detailState.set('loading');
    this.workState.set('loading');

    await Promise.all([
      this.loadDetail(userId, requestSequence),
      this.loadWork(userId, requestSequence),
    ]);
  }

  async retrySelectedUser(): Promise<void> {
    const userId = this.selectedUserId();
    if (userId === null) return;
    await this.selectUser(userId);
  }

  private async loadUsers(cursor: string | null, pageNumber: number): Promise<void> {
    const requestSequence = ++this.userListRequestSequence;
    ++this.selectionRequestSequence;
    this.clearSelection();
    this.usersState.set('loading');
    this.usersError.set(null);
    this.users.set([]);

    try {
      const response = await firstValueFrom(this.api.listUsers(cursor, USER_PAGE_LIMIT));
      if (requestSequence !== this.userListRequestSequence) return;

      this.currentCursor.set(cursor);
      this.nextCursor.set(response.nextCursor);
      this.pageNumber.set(pageNumber);
      this.users.set(response.items);
      this.usersState.set('ready');

      const firstUser = response.items[0];
      if (firstUser) void this.selectUser(firstUser.id);
    } catch (error) {
      if (requestSequence !== this.userListRequestSequence) return;
      if (httpStatus(error) === 403) {
        this.setForbidden();
        return;
      }
      this.usersState.set('error');
      this.usersError.set(readAdminError(error, 'Could not load administrator user summaries.'));
    }
  }

  private async loadDetail(userId: number, requestSequence: number): Promise<void> {
    try {
      const detail = await firstValueFrom(this.api.getUserDetail(userId));
      if (requestSequence !== this.selectionRequestSequence) return;
      this.detail.set(detail);
      this.detailState.set('ready');
    } catch (error) {
      if (requestSequence !== this.selectionRequestSequence) return;
      if (httpStatus(error) === 403) {
        this.setForbidden();
        return;
      }
      this.detailState.set('error');
      this.detailError.set(readAdminError(error, 'User diagnostics are unavailable.'));
    }
  }

  private async loadWork(userId: number, requestSequence: number): Promise<void> {
    try {
      const work = await firstValueFrom(this.api.getUserWork(userId, WORK_ITEM_LIMIT));
      if (requestSequence !== this.selectionRequestSequence) return;
      this.work.set(work);
      this.workState.set('ready');
    } catch (error) {
      if (requestSequence !== this.selectionRequestSequence) return;
      if (httpStatus(error) === 403) {
        this.setForbidden();
        return;
      }
      this.workState.set('error');
      this.workError.set(readAdminError(error, 'User work diagnostics are unavailable.'));
    }
  }

  private setForbidden(): void {
    ++this.capabilityRequestSequence;
    this.invalidateUserRequests();
    this.capability.set(null);
    this.accessState.set('forbidden');
    this.resetUsers();
  }

  private invalidateUserRequests(): void {
    ++this.userListRequestSequence;
    ++this.selectionRequestSequence;
  }

  private resetUsers(): void {
    this.users.set([]);
    this.usersState.set('idle');
    this.usersError.set(null);
    this.currentCursor.set(null);
    this.nextCursor.set(null);
    this.pageNumber.set(1);
    this.clearSelection();
  }

  private clearSelection(): void {
    this.selectedUserId.set(null);
    this.detail.set(null);
    this.detailState.set('idle');
    this.detailError.set(null);
    this.work.set(null);
    this.workState.set('idle');
    this.workError.set(null);
  }
}

function httpStatus(error: unknown): number | null {
  const status = (error as { status?: unknown })?.status;
  return typeof status === 'number' ? status : null;
}

function readAdminError(error: unknown, fallback: string): string {
  const status = httpStatus(error);
  if (status === 404) return 'The selected user is no longer available.';
  if (status === 429) return 'Administrator diagnostics request budget was reached.';

  const payload = (error as { error?: unknown })?.error;
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
