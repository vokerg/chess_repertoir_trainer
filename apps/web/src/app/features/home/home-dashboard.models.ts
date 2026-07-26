import type { AccountPerformanceStatsResponse, ExternalAccount } from '../accounts/data-access/accounts.models';
import type { ImportedGameFacetsResponse, ImportedGameSearchItem } from '../games/data-access/games.models';
import type { LibraryCatalogResponse } from '../library/data-access/library.models';

export type HomeActionTone = 'primary' | 'standard' | 'setup';

export interface HomeAction {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  link: string | readonly (string | number)[];
  queryParams?: Readonly<Record<string, string | number>>;
  meta?: string;
  tone: HomeActionTone;
}

export interface HomeDashboardData {
  accounts: readonly ExternalAccount[];
  catalog: LibraryCatalogResponse;
  facets: ImportedGameFacetsResponse | null;
  recentGames: readonly ImportedGameSearchItem[];
  performance: AccountPerformanceStatsResponse | null;
}

export interface HomeProgressSummary {
  gamesCount: number;
  wins: number;
  draws: number;
  losses: number;
  scorePercent: number | null;
  trainingAttempts: number;
  weakSublineCount: number;
}
