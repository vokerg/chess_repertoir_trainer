import { CurrentUserService } from '../../services/currentUserService';
import { listImportedGames } from './games.repository.prisma';
import { ListImportedGamesQuery } from './games.schemas';

function compactGame(game: any) {
  const latestAnalysis = game.analysisRuns?.[0] ?? null;

  return {
    id: game.id,
    accountId: game.accountId,
    account: game.account,
    provider: game.provider,
    providerGameId: game.providerGameId,
    providerUrl: game.providerUrl,
    rated: game.rated,
    variant: game.variant,
    speedCategory: game.speedCategory,
    timeControlRaw: game.timeControlRaw,
    timeControlInitial: game.timeControlInitial,
    timeControlIncrement: game.timeControlIncrement,
    startedAt: game.startedAt,
    endedAt: game.endedAt,
    whiteUsername: game.whiteUsername,
    blackUsername: game.blackUsername,
    whiteRating: game.whiteRating,
    blackRating: game.blackRating,
    userColor: game.userColor,
    opponentUsername: game.opponentUsername,
    result: game.result,
    resultForUser: game.resultForUser,
    status: game.status,
    openingName: game.openingName,
    openingEco: game.openingEco,
    analysis: latestAnalysis
      ? {
          id: latestAnalysis.id,
          status: latestAnalysis.status,
          depth: latestAnalysis.depth,
          multipv: latestAnalysis.multipv,
          engineName: latestAnalysis.engineName,
          engineVersion: latestAnalysis.engineVersion,
          positionsTotal: latestAnalysis.positionsTotal,
          positionsDone: latestAnalysis.positionsDone,
          accuracyVersion: latestAnalysis.accuracyVersion,
          whiteAccuracy: latestAnalysis.whiteAccuracy,
          blackAccuracy: latestAnalysis.blackAccuracy,
          whiteAverageCentipawnLoss: latestAnalysis.whiteAverageCentipawnLoss,
          blackAverageCentipawnLoss: latestAnalysis.blackAverageCentipawnLoss,
          whiteMovesAnalyzed: latestAnalysis.whiteMovesAnalyzed,
          blackMovesAnalyzed: latestAnalysis.blackMovesAnalyzed,
          error: latestAnalysis.error,
          startedAt: latestAnalysis.startedAt,
          completedAt: latestAnalysis.completedAt,
          createdAt: latestAnalysis.createdAt,
        }
      : null,
  };
}

export const GamesService = {
  listImportedGames: async (query: ListImportedGamesQuery) => {
    await CurrentUserService.getOrCreate();
    const result = await listImportedGames(query);

    return {
      total: result.total,
      take: result.take,
      skip: result.skip,
      games: result.games.map(compactGame),
    };
  },
};
