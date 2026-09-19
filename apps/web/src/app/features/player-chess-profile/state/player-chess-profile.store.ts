import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  PlayerChessProfileDimension,
  PlayerChessProfileQuery,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import { PlayerChessProfileApiService } from '../data-access/player-chess-profile-api.service';
import type { PlayerChessProfileAccountDto } from '../data-access/player-chess-profile.models';
import {
  defaultPlayerChessProfileFilters,
  playerChessProfilePeriodRange,
} from '../helpers/player-chess-profile-period';
import {
  buildPlayerChessProfileAccountViewModels,
  buildPlayerChessProfileConclusionViewModels,
  buildPlayerChessProfileCoverageViewModel,
  buildPlayerChessProfileEvidence,
  buildPlayerChessProfilePerformanceRows,
  buildPlayerChessProfilePreferenceRows,
  playerChessProfileContextLabel,
} from '../helpers/player-chess-profile-view-model';
import type {
  PlayerChessProfileColor,
  PlayerChessProfileEvidenceSelection,
  PlayerChessProfileFilters,
  PlayerChessProfilePeriod,
  PlayerChessProfileView,
} from './player-chess-profile.models';

@Injectable()
export class PlayerChessProfileStore {
  private readonly api = inject(PlayerChessProfileApiService);
  private requestId = 0;

  private readonly filtersState = signal<PlayerChessProfileFilters>(defaultPlayerChessProfileFilters());
  private readonly accountsState = signal<readonly PlayerChessProfileAccountDto[]>([]);
  private readonly accountsLoadingState = signal(false);
  private readonly accountsErrorState = signal<string | null>(null);
  private readonly responseState = signal<PlayerChessProfileResponse | null>(null);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly activeViewState = signal<PlayerChessProfileView>('PREFERENCE');
  private readonly selectedDimensionState = signal<PlayerChessProfileDimension>('CHARACTER');
  private readonly evidenceSelectionState = signal<PlayerChessProfileEvidenceSelection | null>(null);

  readonly filters = this.filtersState.asReadonly();
  readonly accountsLoading = this.accountsLoadingState.asReadonly();
  readonly accountsError = this.accountsErrorState.asReadonly();
  readonly response = this.responseState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly activeView = this.activeViewState.asReadonly();
  readonly selectedDimension = this.selectedDimensionState.asReadonly();
  readonly evidenceSelection = this.evidenceSelectionState.asReadonly();

  readonly accountOptions = computed(() => buildPlayerChessProfileAccountViewModels(
    this.accountsState(),
    this.filtersState().accountIds,
  ));

  readonly conclusionItems = computed(() => {
    const response = this.responseState();
    return response ? buildPlayerChessProfileConclusionViewModels(response) : [];
  });

  readonly preferenceItems = computed(() => {
    const response = this.responseState();
    return response
      ? buildPlayerChessProfilePreferenceRows(response, this.selectedDimensionState())
      : [];
  });

  readonly performanceItems = computed(() => {
    const response = this.responseState();
    return response
      ? buildPlayerChessProfilePerformanceRows(response, this.selectedDimensionState())
      : [];
  });

  readonly evidence = computed(() => {
    const response = this.responseState();
    return response ? buildPlayerChessProfileEvidence(response, this.evidenceSelectionState()) : null;
  });

  readonly coverage = computed(() => {
    const response = this.responseState();
    return response ? buildPlayerChessProfileCoverageViewModel(response) : null;
  });

  readonly contextLabel = computed(() => {
    const response = this.responseState();
    return response ? playerChessProfileContextLabel(response, this.accountsState()) : '';
  });

  readonly headerStats = computed(() => {
    const response = this.responseState();
    if (!response) return [];
    return [
      { id: 'games', label: 'Games', value: response.coverage.totalGames },
      {
        id: 'analysis',
        label: 'Analysed',
        value: response.coverage.analysisPercent === null
          ? '—'
          : `${response.coverage.analysisPercent}%`,
      },
      {
        id: 'classification',
        label: 'Profiled',
        value: response.coverage.classifiedOpeningGames,
      },
    ] as const;
  });

  readonly selectedConclusionIndex = computed(() => {
    const selection = this.evidenceSelectionState();
    return selection?.kind === 'CONCLUSION' ? selection.index : null;
  });

  readonly hasResponse = computed(() => this.responseState() !== null);
  readonly hasNoData = computed(
    () => this.loadedState() && this.responseState()?.coverage.totalGames === 0,
  );
  readonly hasPartialAnalysis = computed(() => {
    const response = this.responseState();
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
    const current = this.filtersState().accountIds;
    const accountIds = current.includes(accountId)
      ? current.filter((id) => id !== accountId)
      : [...current, accountId].sort((left, right) => left - right);
    this.patchFilters({ accountIds });
  }

  selectAllAccounts(): void {
    this.patchFilters({ accountIds: [] });
  }

  toggleColor(color: PlayerChessProfileColor): void {
    const current = this.filtersState().colors;
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
    this.activeViewState.set(view);
  }

  setDimension(dimension: PlayerChessProfileDimension): void {
    this.selectedDimensionState.set(dimension);
  }

  selectConclusion(index: number): void {
    this.evidenceSelectionState.set({ kind: 'CONCLUSION', index });
  }

  selectBreakdown(
    kind: 'PREFERENCE' | 'PERFORMANCE',
    dimension: PlayerChessProfileDimension,
    value: string,
  ): void {
    this.evidenceSelectionState.set({ kind, dimension, value });
  }

  async loadAccounts(): Promise<void> {
    this.accountsLoadingState.set(true);
    this.accountsErrorState.set(null);
    try {
      const accounts = await firstValueFrom(this.api.getAccounts());
      this.accountsState.set([...accounts].sort(
        (left, right) =>
          Number(Boolean(right.isDefaultProgressAccount))
          - Number(Boolean(left.isDefaultProgressAccount))
          || left.provider.localeCompare(right.provider)
          || left.username.localeCompare(right.username),
      ));
    } catch {
      this.accountsState.set([]);
      this.accountsErrorState.set(
        'Could not load connected accounts. The combined profile can still be recalculated.',
      );
    } finally {
      this.accountsLoadingState.set(false);
    }
  }

  async load(): Promise<void> {
    const currentRequest = ++this.requestId;
    const validationError = this.validateFilters(this.filtersState());
    if (validationError) {
      this.loadingState.set(false);
      this.errorState.set(validationError);
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const response = await firstValueFrom(this.api.getProfile(this.query()));
      if (currentRequest !== this.requestId) return;
      this.responseState.set(response);
      this.loadedState.set(true);
      this.evidenceSelectionState.set(
        response.conclusions.length > 0 ? { kind: 'CONCLUSION', index: 0 } : null,
      );
    } catch {
      if (currentRequest !== this.requestId) return;
      this.errorState.set('Could not calculate the player profile.');
    } finally {
      if (currentRequest === this.requestId) this.loadingState.set(false);
    }
  }

  private patchFilters(patch: Partial<PlayerChessProfileFilters>): void {
    this.filtersState.update((filters) => ({ ...filters, ...patch }));
  }

  private query(): PlayerChessProfileQuery {
    const filters = this.filtersState();
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
