import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AccountsApiService } from '../accounts/data-access/accounts-api.service';
import type { AccountPerformanceStatsResponse, ExternalAccount } from '../accounts/data-access/accounts.models';
import { GamesApiService } from '../games/data-access/games-api.service';
import type { ImportedGameFacetsResponse, ImportedGameSearchItem } from '../games/data-access/games.models';
import { LibraryApiService } from '../library/data-access/library-api.service';
import type { LibraryCatalogResponse } from '../library/data-access/library.models';
import {
  buildHomeContinueAction,
  buildHomeProgressSummary,
  buildHomeRecommendations,
  selectHomeAccount,
} from './home-dashboard.helpers';
import type { HomeDashboardData } from './home-dashboard.models';

const EMPTY_CATALOG: LibraryCatalogResponse = { courses: [] };

@Injectable()
export class HomeDashboardStore {
  private readonly auth = inject(AuthService);
  private readonly accountsApi = inject(AccountsApiService);
  private readonly libraryApi = inject(LibraryApiService);
  private readonly gamesApi = inject(GamesApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly warnings = signal<readonly string[]>([]);
  readonly accounts = signal<readonly ExternalAccount[]>([]);
  readonly catalog = signal<LibraryCatalogResponse>(EMPTY_CATALOG);
  readonly facets = signal<ImportedGameFacetsResponse | null>(null);
  readonly recentGames = signal<readonly ImportedGameSearchItem[]>([]);
  readonly performance = signal<AccountPerformanceStatsResponse | null>(null);

  readonly selectedAccount = computed(() => selectHomeAccount(this.accounts()));
  readonly data = computed<HomeDashboardData>(() => ({
    accounts: this.accounts(),
    catalog: this.catalog(),
    facets: this.facets(),
    recentGames: this.recentGames(),
    performance: this.performance(),
  }));
  readonly continueAction = computed(() => buildHomeContinueAction(this.data()));
  readonly recommendations = computed(() => buildHomeRecommendations(this.data(), this.continueAction()));
  readonly progress = computed(() => buildHomeProgressSummary(this.data()));
  readonly greeting = computed(() => `${daypartGreeting()}, ${firstName(this.auth.displayName())}.`);
  readonly accountLabel = computed(() => {
    const account = this.selectedAccount();
    return account ? account.displayName || account.username : 'No account connected';
  });
  readonly syncLabel = computed(() => formatSyncLabel(this.selectedAccount()?.lastSyncAt));

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.warnings.set([]);

    const warnings: string[] = [];
    const [accountsResult, catalogResult, facetsResult, gamesResult] = await Promise.allSettled([
      firstValueFrom(this.accountsApi.getAccounts()),
      firstValueFrom(this.libraryApi.getCatalog()),
      firstValueFrom(this.gamesApi.getFacets()),
      firstValueFrom(this.gamesApi.searchGames({ sort: 'endedAtDesc', limit: 6 })),
    ]);

    if (accountsResult.status === 'fulfilled') this.accounts.set(accountsResult.value);
    else warnings.push('Connected accounts could not be loaded.');

    if (catalogResult.status === 'fulfilled') this.catalog.set(catalogResult.value);
    else warnings.push('Repertoire training data could not be loaded.');

    if (facetsResult.status === 'fulfilled') this.facets.set(facetsResult.value);
    else warnings.push('Game totals and analysis backlog could not be loaded.');

    if (gamesResult.status === 'fulfilled') this.recentGames.set(gamesResult.value.items);
    else warnings.push('Recent games could not be loaded.');

    const selectedAccount = selectHomeAccount(
      accountsResult.status === 'fulfilled' ? accountsResult.value : [],
    );
    if (selectedAccount) {
      try {
        this.performance.set(
          await firstValueFrom(
            this.accountsApi.getPerformanceStats(selectedAccount.id, lastThirtyDaysRange()),
          ),
        );
      } catch {
        warnings.push('Recent performance could not be loaded.');
      }
    } else {
      this.performance.set(null);
    }

    this.warnings.set(warnings);
    if (warnings.length === 4 && !selectedAccount) {
      this.error.set('Home data could not be loaded. Check the API connection and try again.');
    }
    this.loading.set(false);
  }

  async reload(): Promise<void> {
    this.accounts.set([]);
    this.catalog.set(EMPTY_CATALOG);
    this.facets.set(null);
    this.recentGames.set([]);
    this.performance.set(null);
    await this.load();
  }
}

function lastThirtyDaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: dateOnly(from), to: dateOnly(to) };
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function firstName(displayName: string | null): string {
  const value = displayName?.trim();
  if (!value) return 'there';
  const [first] = value.split(/\s+/, 1);
  return first || 'there';
}

function daypartGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatSyncLabel(lastSyncAt: string | null | undefined): string {
  if (!lastSyncAt) return 'Not synced yet';
  const value = new Date(lastSyncAt);
  if (Number.isNaN(value.getTime())) return 'Sync time unavailable';
  return `Synced ${new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    -Math.max(0, Math.round((Date.now() - value.getTime()) / (60 * 60 * 1000))),
    'hour',
  )}`;
}
