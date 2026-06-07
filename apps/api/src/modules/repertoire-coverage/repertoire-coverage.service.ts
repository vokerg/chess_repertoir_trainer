import { normalizeFenForPosition } from 'chess-domain';
import { classifyLineCoverageGame } from './repertoire-coverage.matcher';
import {
  getCoverageCandidateGames,
  getCoverageLine,
  getCoveragePlies,
} from './repertoire-coverage.repository.prisma';
import { LineCoverageGame, LineCoverageStatus, RepertoireColor } from './repertoire-coverage.types';

const COVERAGE_STATUSES: LineCoverageStatus[] = [
  'MATCHED_LINE',
  'USER_DEVIATION',
  'OPPONENT_UNCOVERED',
  'LINE_ENDED',
  'NOT_REACHED',
  'UNINDEXED_GAME',
];

function resultForUser(value: string | null): 'WIN' | 'DRAW' | 'LOSS' | null {
  return value === 'WIN' || value === 'DRAW' || value === 'LOSS' ? value : null;
}

export const LineCoverageService = {
  statuses: COVERAGE_STATUSES,
  calculate: async (
    lineId: number,
    options: { status?: LineCoverageStatus; limit: number; offset: number },
  ) => {
    const line = await getCoverageLine(lineId);
    if (!line) return null;
    if (line.sideToTrain !== 'WHITE' && line.sideToTrain !== 'BLACK') {
      throw new Error(`Unsupported line side: ${line.sideToTrain}`);
    }

    const sideToTrain = line.sideToTrain as RepertoireColor;
    const normalizedStartFen = normalizeFenForPosition(line.startingFen || 'startpos');
    const games = await getCoverageCandidateGames({
      sideToTrain,
      since: line.repertoireUpdatedAt,
      limit: options.limit,
      offset: options.offset,
    });
    const indexedGameIds = games.filter((game) => game.plyIndexedAt).map((game) => game.id);
    const plies = await getCoveragePlies(indexedGameIds);
    const pliesByGameId = new Map<number, typeof plies>();
    for (const ply of plies) {
      const grouped = pliesByGameId.get(ply.importedGameId) ?? [];
      grouped.push(ply);
      pliesByGameId.set(ply.importedGameId, grouped);
    }

    const results: LineCoverageGame[] = games.map((game) =>
      classifyLineCoverageGame({
        game: {
          gameId: game.id,
          provider: game.provider,
          providerGameId: game.providerGameId,
          providerUrl: game.providerUrl,
          endedAt: game.endedAt,
          importedAt: game.createdAt,
          userColor:
            game.userColor === 'WHITE' || game.userColor === 'BLACK' ? game.userColor : null,
          opponentUsername: game.opponentUsername,
          resultForUser: resultForUser(game.resultForUser),
        },
        indexed: game.plyIndexedAt !== null,
        plies: (pliesByGameId.get(game.id) ?? []).map((ply) => ({
          plyNumber: ply.plyNumber,
          moveUci: ply.moveUci,
          normalizedFenBefore: ply.position.normalizedFen,
        })),
        nodes: line.moves,
        normalizedStartFen,
        sideToTrain,
      }),
    );

    const count = (status: LineCoverageStatus) =>
      results.filter((result) => result.status === status).length;
    const deviations = options.status
      ? results.filter((result) => result.status === options.status)
      : results.filter(
          (result) => result.status === 'USER_DEVIATION' || result.status === 'OPPONENT_UNCOVERED',
        );

    return {
      line: {
        id: line.id,
        chapterId: line.chapterId,
        name: line.name,
        sideToTrain,
        startingFen: line.startingFen,
        repertoireUpdatedAt: line.repertoireUpdatedAt.toISOString(),
        hasMoves: line.moves.length > 0,
      },
      summary: {
        gamesSinceUpdate: results.length,
        indexedGamesSinceUpdate: results.length - count('UNINDEXED_GAME'),
        reachedLine: results.length - count('NOT_REACHED') - count('UNINDEXED_GAME'),
        matchedLine: count('MATCHED_LINE'),
        userDeviations: count('USER_DEVIATION'),
        opponentUncovered: count('OPPONENT_UNCOVERED'),
        lineEnded: count('LINE_ENDED'),
        notReached: count('NOT_REACHED'),
        unindexedGames: count('UNINDEXED_GAME'),
      },
      pagination: { limit: options.limit, offset: options.offset, returnedGames: results.length },
      deviations,
    };
  },
};
