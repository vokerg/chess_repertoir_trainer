import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  PlayerChessProfileDimension,
  PlayerChessProfileQuery,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import { PlayerChessProfileApiService } from '../data-access/player-chess-profile-api.service';
import type {
  PlayerChessProfileAccountOption,
  PlayerChessProfileColor,
  PlayerChessProfileEvidenceSelection,
  PlayerChessProfileFilters,
  PlayerChessProfilePeriod,
  PlayerChessProfileView,
} from '../data-access/player-chess-profile.models';
import {
  defaultPlayerChessProfileFilters,
  playerChessProfilePeriodRange,
} from '../helpers/player-chess-profile-period';
import {
  buildPlayerChessProfileEvidence,
  playerChessProfileContextLabel,
} from '../helpers/player-chess-profile-view-model';

@Injectable()
export class PlayerChessProfileStore {
  private readonly api = inject(PlayerChessProfileApiService);
  private requestId = 0;

  readonly filters = signal<PlayerChessProfileFilters>(defaultPlayerChessProfileFilters());
  readonly accounts = signal<readonly PlayerChessProfileAccountOption[]>([]);
  readonly accountsLoading = signal(false);
  readonly accountsError = signal<string | null>(null);
  readonly response = signal<PlayerChessProfileResponse | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeView = signal<PlayerChessProfileView>('PREFERENCE');
  readonly selectedDimension = signal<PlayerChessProfileDimension>('CHARACTER');
  readonly evidenceSelection = signal<PlayerChessProfileEvidenceSelection | null>(null);

  readonly preferenceItems = computed(() => {
    const response = this.response();
    if (!response) return [];
    const dimension = this.selectedDimension();
    return response.preference.items
      .filter((item) => item.dimension === dimension && item.value !== 'UNKNOWN')
      .sort((left, right) => right.games - left.games || left.value.localeCompare(right.value));
  });

  readonly performanceItems = computed(() => {
    const response = this.response();
    if (!response) return [];
    const dimension = this.selectedDimension();
    return response.performance.items
      .filter((item) => item.dimension === dimension && item.value !== 'UNKNOWN')
      .sort((left, right) => {
        const leftDelta = left.scoreDelta ?? Number.NEGATIVE_INFINITY;
        const rightDelta = right.scoreDelta ?? Number.NEGATIVE_INFINITY;
        return rightDelta - leftDelta || right.games - left.games || left.value.localeCompare(right.value);
      });
  });

  readonly evidence = computed(() => {
    const response = this.response();
    return response ? buildPlayerChessProfileEvidence(response, this.evidenceSelection()) : null;
  });

  readonly contextLabel = computed(() => {
    const response = this.response();
    return response ? playerChessProfileContextLabel(response, this.accounts()) : '';
  });

  readonly hasNoData = computed(() => this.loaded() && this.response()?.coverage.totalGames === 0);
  readonly hasPartialAnalysis = computed(() => {
    const response = this.response();
    return Boolean(
      response
      && response.coverage.totalGames > 0
      && (response.coverage.analysisPercent ?? 0) < 50,
    );
  });

  async initialize(): Promise<void> {
    await Promise.all([this.loadAccounts(), this.load()]);
  }

  setPeriod(period: PlayerChessProfilePeriod): void {
    if (period === 'CUSTOM') {
      this.patchFilters({ period });
      return;
    }
    this.patchFilters(playerChessProfilePeriodRange(period));
  }

  setDate(key: 'from' | 'to', value: string): void {
    this.patchFilters({ period: 'CUSTOM', [key]: value });
  }

  setSpeedPreset(speedPreset: PlayerChessProfileFilters['speedPreset']): void {
    this.patchFilters({ speedPreset });
  }

  setRated(rated: boolean): void {
    this.patchFilters({ rated });
  }

  toggleAccount(accountId: number): void {
    const current = this.filters().accountIds;
    const accountIds = current.includes(accountId)
      ? current.filter((id) => id !== accountId)
      : [...current, accountId].sort((left, right) => left - right);
    this.patchFilters({ accountIds });
  }

  selectAllAccounts(): void {
    this.patchFilters({ accountIds: [] });
  }

  toggleColor(color: PlayerChessProfileColor): void {
    const current = this.filters().colors;
    if (current.includes(color) && current.length === 1) return;
    const colors = current.includes(color)
      ? current.filter((candidate) => candidate !== color)
      : (['WHITE', 'BLACK'] as const).filter(
        (candidate) => candidate === color || current.includes(candidate),
      );
    this.patchFilters({ colors });
  }

  setRatingFilter(
    key: 'minUserRating' | 'maxUserRating' | 'minOpponentRating' | 'maxOpponentRating',
    value: string,
  ): void {
    const trimmed = value.trim();
    if (!trimmed) {
      this.patchFilters({ [key]: null });
      return;
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return;
    this.patchFilters({ [key]: Math.max(0, Math.min(5000, Math.floor(numeric))) });
  }

  clearRatingContext(): void {
    this.patchFilters({
      minUserRating: null,
      maxUserRating: null,
      minOpponentRating: null,
      maxOpponentRating: null,
    });
  }

  setActiveView(view: PlayerChessProfileView): void {
    this.activeView.set(view);
  }

  setDimension(dimension: PlayerChessProfileDimension): void {
    this.selectedDimension.set(dimension);
  }

  selectConclusion(index: number): void {
    this.evidenceSelection.set({ kind: 'CONCLUSION', index });
  }

  selectBreakdown(
    kind: 'PREFERENCE' | 'PERFORMANCE',
    dimension: PlayerChessProfileDimension,
    value: string,
  ): void {
    this.evidenceSelection.set({ kind, dimension, value });
  }

  async loadAccounts(): Promise<void> {
    this.accountsLoading.set(true);
    this.accountsError.set(null);
    try {
      const accounts = await firstValueFrom(this.api.getAccounts());
      this.accounts.set([...accounts].sort(
        (left, right) =>
          Number(Boolean(right.isDefaultProgressAccount))
          - Number(Boolean(left.isDefaultProgressAccount))
          || left.provider.localeCompare(right.provider)
          || left.username.localeCompare(right.username),
      ));
    } catch {
      this.accounts.set([]);
      this.accountsError.set(
        'Could not load connected accounts. The combined profile can still be recalculated.',
      );
    } finally {
      this.accountsLoading.set(false);
    }
  }

  async load(): Promise<void> {
    const validationError = this.validateFilters(this.filters());
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    const currentRequest = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.api.getProfile(this.query()));
      if (currentRequest !== this.requestId) return;
      this.response.set(response);
      this.loaded.set(true);
      this.evidenceSelection.set(
        response.conclusions.length > 0 ? { kind: 'CONCLUSION', index: 0 } : null,
      );
    } catch {
      if (currentRequest !== this.requestId) return;
      this.error.set('Could not calculate the player profile.');
    } finally {
      if (currentRequest === this.requestId) this.loading.set(false);
    }
  }

  private patchFilters(patch: Partial<PlayerChessProfileFilters>): void {
    this.filters.update((filters) => ({ ...filters, ...patch }));
  }

  private query(): PlayerChessProfileQuery {
    const filters = this.filters();
    return {
      accountIds: filters.accountIds.length > 0 ? [...filters.accountIds] : undefined,
      from: filters.from,
      to: filters.to,
      speedPreset: filters.speedPreset,
      colors: [...filters.colors],
      rated: filters.rated,
      minUserRating: filters.minUserRating ?? undefined,
      maxUserRating: filters.maxUserRating ?? undefined,
      minOpponentRating: filters.minOpponentRating ?? undefined,
      maxOpponentRating: filters.maxOpponentRating ?? undefined,
      supportingGamesLimit: 10,
    };
  }

  private validateFilters(filters: PlayerChessProfileFilters): string | null {
    if (!filters.from || !filters.to) return 'Choose both profile dates.';
    if (filters.from > filters.to) return 'From date must not be after to date.';
    if (
      filters.minUserRating !== null
      && filters.maxUserRating !== null
      && filters.minUserRating > filters.maxUserRating
    ) {
      return 'Minimum player rating must not exceed maximum player rating.';
    }
    if (
      filters.minOpponentRating !== null
      && filters.maxOpponentRating !== null
      && filters.minOpponentRating > filters.maxOpponentRating
    ) {
      return 'Minimum opponent rating must not exceed maximum opponent rating.';
    }
    return null;
  }
}
