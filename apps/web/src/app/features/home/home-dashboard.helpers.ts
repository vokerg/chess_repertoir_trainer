import type { ExternalAccount } from '../accounts/data-access/accounts.models';
import type { ImportedGameSearchItem } from '../games/data-access/games.models';
import type { LibraryCatalogResponse } from '../library/data-access/library.models';
import type { HomeAction, HomeDashboardData, HomeProgressSummary } from './home-dashboard.models';

export const HOME_SYNC_STALE_DAYS = 7;

export function selectHomeAccount(accounts: readonly ExternalAccount[]): ExternalAccount | null {
  return (
    accounts.find((account) => account.isDefaultProgressAccount) ??
    accounts.find((account) => account.isActive) ??
    accounts[0] ??
    null
  );
}

export function buildHomeContinueAction(data: HomeDashboardData): HomeAction {
  const weakCourse = rankedCourse(data.catalog, 'weakSublineCount');
  if (weakCourse && weakCourse.stats.weakSublineCount > 0) {
    return courseTrainingAction(weakCourse, 'WEAK_SUBLINES');
  }

  const untrainedCourse = rankedCourse(data.catalog, 'untrainedSublineCount');
  if (untrainedCourse && untrainedCourse.stats.untrainedSublineCount > 0) {
    return courseTrainingAction(untrainedCourse, 'UNTRAINED_SUBLINES');
  }

  const analysedGame = latestAnalysedGame(data.recentGames);
  if (analysedGame) return gameReviewAction(analysedGame, 'primary');

  return {
    id: 'study-library',
    eyebrow: 'Continue studying',
    title: 'Open your repertoire library',
    description: 'Choose a course, section, or line and start a focused training session.',
    link: '/library',
    tone: 'primary',
  };
}

export function buildHomeRecommendations(
  data: HomeDashboardData,
  continueAction: HomeAction,
  now: Date = new Date(),
): readonly HomeAction[] {
  const candidates: HomeAction[] = [];
  const selectedAccount = selectHomeAccount(data.accounts);

  if (data.accounts.length === 0) {
    candidates.push({
      id: 'setup-account',
      eyebrow: 'Set up your workspace',
      title: 'Connect a chess account',
      description: 'Add a Lichess or Chess.com account so games and progress can appear here.',
      link: '/settings/accounts',
      tone: 'setup',
    });
  } else if (data.facets && importedGameCount(data, selectedAccount) === 0) {
    candidates.push({
      id: 'setup-games',
      eyebrow: 'Import your chess',
      title: 'Sync your first games',
      description: 'Bring in recent games before analysis and repertoire recommendations can be generated.',
      link: '/settings/accounts',
      tone: 'setup',
    });
  }

  if (data.catalog.courses.length === 0) {
    candidates.push({
      id: 'setup-course',
      eyebrow: 'Build your repertoire',
      title: 'Create your first course',
      description: 'Organize opening lines into a course that can be reviewed and trained.',
      link: '/courses',
      tone: 'setup',
    });
  }

  const analysisBacklog = data.facets?.analysisStatuses.find((status) => status.value === 'NOT_ANALYZED')?.count ?? 0;
  if (analysisBacklog > 0) {
    candidates.push({
      id: 'analysis-backlog',
      eyebrow: 'Games need analysis',
      title: `Review ${analysisBacklog} unanalysed ${analysisBacklog === 1 ? 'game' : 'games'}`,
      description: 'Analysis unlocks accuracy, tactical findings, tags, and stronger recommendations.',
      link: '/games',
      queryParams: { analysisStatus: 'NOT_ANALYZED' },
      meta: `${analysisBacklog} waiting`,
      tone: 'standard',
    });
  }

  const weakCourse = rankedCourse(data.catalog, 'weakSublineCount');
  if (weakCourse && weakCourse.stats.weakSublineCount > 0) {
    candidates.push(courseTrainingAction(weakCourse, 'WEAK_SUBLINES', 'standard'));
  }

  const untrainedCourse = rankedCourse(data.catalog, 'untrainedSublineCount');
  if (untrainedCourse && untrainedCourse.stats.untrainedSublineCount > 0) {
    candidates.push(courseTrainingAction(untrainedCourse, 'UNTRAINED_SUBLINES', 'standard'));
  }

  const analysedGame = latestAnalysedGame(data.recentGames);
  if (analysedGame) candidates.push(gameReviewAction(analysedGame, 'standard'));

  if (selectedAccount && isSyncStale(selectedAccount.lastSyncAt, now)) {
    candidates.push({
      id: `sync-account-${selectedAccount.id}`,
      eyebrow: 'Refresh your data',
      title: `Sync ${selectedAccount.displayName || selectedAccount.username}`,
      description: selectedAccount.lastSyncAt
        ? `The last successful sync was more than ${HOME_SYNC_STALE_DAYS} days ago.`
        : 'This account has not completed a sync yet.',
      link: '/settings/accounts',
      tone: 'standard',
    });
  }

  if (selectedAccount && data.performance && data.performance.gamesCount > 0) {
    candidates.push({
      id: `progress-${selectedAccount.id}`,
      eyebrow: 'Check your progress',
      title: 'Review recent performance',
      description: 'Open the existing player dashboard for rating, results, opponents, and game highlights.',
      link: ['/progress/accounts', selectedAccount.id],
      meta: `${data.performance.gamesCount} games`,
      tone: 'standard',
    });
  }

  return candidates.filter((action) => action.id !== continueAction.id).slice(0, 3);
}

export function buildHomeProgressSummary(data: HomeDashboardData): HomeProgressSummary {
  const performance = data.performance;
  const gamesCount = performance?.gamesCount ?? 0;
  const wins = performance?.wdl.wins ?? 0;
  const draws = performance?.wdl.draws ?? 0;
  const losses = performance?.wdl.losses ?? 0;
  const scorePercent = gamesCount > 0 ? Math.round(((wins + draws * 0.5) / gamesCount) * 100) : null;

  return {
    gamesCount,
    wins,
    draws,
    losses,
    scorePercent,
    trainingAttempts: data.catalog.courses.reduce((sum, course) => sum + course.stats.totalAttempts, 0),
    weakSublineCount: data.catalog.courses.reduce((sum, course) => sum + course.stats.weakSublineCount, 0),
  };
}

export function isSyncStale(lastSyncAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastSyncAt) return true;
  const lastSync = new Date(lastSyncAt);
  if (Number.isNaN(lastSync.getTime())) return true;
  return now.getTime() - lastSync.getTime() >= HOME_SYNC_STALE_DAYS * 24 * 60 * 60 * 1000;
}

function importedGameCount(data: HomeDashboardData, selectedAccount: ExternalAccount | null): number {
  if (!data.facets) return 0;
  if (selectedAccount) {
    return data.facets.accounts.find((account) => account.id === selectedAccount.id)?.gameCount ?? 0;
  }
  return data.facets.accounts.reduce((sum, account) => sum + account.gameCount, 0);
}

function rankedCourse(
  catalog: LibraryCatalogResponse,
  field: 'weakSublineCount' | 'untrainedSublineCount',
): LibraryCatalogResponse['courses'][number] | null {
  return (
    [...catalog.courses]
      .filter((course) => course.stats[field] > 0)
      .sort((left, right) =>
        right.stats[field] - left.stats[field] ||
        right.stats.failedCount - left.stats.failedCount ||
        left.id - right.id,
      )[0] ?? null
  );
}

function courseTrainingAction(
  course: LibraryCatalogResponse['courses'][number],
  mode: 'WEAK_SUBLINES' | 'UNTRAINED_SUBLINES',
  tone: HomeAction['tone'] = 'primary',
): HomeAction {
  const weak = mode === 'WEAK_SUBLINES';
  const count = weak ? course.stats.weakSublineCount : course.stats.untrainedSublineCount;
  return {
    id: `${weak ? 'weak' : 'untrained'}-course-${course.id}`,
    eyebrow: weak ? 'Continue weak-line training' : 'Continue repertoire training',
    title: `Train ${course.name}`,
    description: weak
      ? `${count} ${count === 1 ? 'subline needs' : 'sublines need'} reinforcement based on recent attempts.`
      : `${count} active ${count === 1 ? 'subline has' : 'sublines have'} not been trained yet.`,
    link: ['/courses', course.id, 'marathon'],
    queryParams: { mode },
    meta: `${count} ${weak ? 'weak' : 'untrained'}`,
    tone,
  };
}

function latestAnalysedGame(games: readonly ImportedGameSearchItem[]): ImportedGameSearchItem | null {
  return games.find((game) => game.analysis.status === 'COMPLETED') ?? null;
}

function gameReviewAction(game: ImportedGameSearchItem, tone: HomeAction['tone']): HomeAction {
  const opening = game.opening.name || game.opening.eco || 'Recent game';
  return {
    id: `review-game-${game.id}`,
    eyebrow: 'Continue game review',
    title: `Review ${opening}`,
    description: game.analysis.userAccuracy === null
      ? 'Open the latest completed analysis and inspect the critical decisions.'
      : `Your recorded accuracy was ${Math.round(game.analysis.userAccuracy)}%. Review the critical decisions.`,
    link: ['/games', game.id],
    meta: game.resultForUser ? game.resultForUser.toLowerCase() : undefined,
    tone,
  };
}
