import {
  findImportedGamesForOpeningStruggles,
  OpeningStrugglesGameRow,
} from '../imported-games/imported-games.repository.prisma';
import { ImportedGameSummaryQuery } from '../imported-games/imported-games.schemas';
import { OpeningStrugglesQuery } from './opening-struggles.schema';

interface OpeningStruggleNode {
  key: string;
  moveUci: string;
  movesUci: string[];
  ply: number;
  parentKey: string | null;
  userColor: 'WHITE' | 'BLACK';
  totalReachGameIds: Set<number>;
  metricGameIds: Set<number>;
  wins: number;
  draws: number;
  losses: number;
  evalGames: number;
  evalSumUserCp: number;
  bestUserEvalCp: number | null;
  worstUserEvalCp: number | null;
  analysedMoveCount: number;
  centipawnLossSum: number;
  afterPositionAnalysisId: number | null;
  afterPositionNormalizedFen: string | null;
  afterPositionBestScoreCpWhite: number | null;
  afterPositionBestMateWhite: number | null;
  children: Map<string, OpeningStruggleNode>;
}

function roundPercent(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function effectiveScoreCpWhite(scoreCpWhite?: number | null, mateWhite?: number | null) {
  if (typeof scoreCpWhite === 'number' && Number.isFinite(scoreCpWhite)) return scoreCpWhite;
  if (typeof mateWhite !== 'number' || !Number.isFinite(mateWhite)) return null;
  return mateWhite >= 0 ? 1000 : -1000;
}

function userEvalCpFromWhiteEval(
  scoreCpWhite: number | null | undefined,
  mateWhite: number | null | undefined,
  userColor: string | null,
) {
  const whiteEvalCp = effectiveScoreCpWhite(scoreCpWhite, mateWhite);
  if (whiteEvalCp === null) return null;
  if (userColor === 'WHITE') return whiteEvalCp;
  if (userColor === 'BLACK') return -whiteEvalCp;
  return null;
}

function importedGameFilters(query: OpeningStrugglesQuery): ImportedGameSummaryQuery {
  const {
    minGames: _minGames,
    mode: _mode,
    minOccurrences: _minOccurrences,
    minAverageCentipawnLoss: _minAverageCentipawnLoss,
    minEvaluatedGames: _minEvaluatedGames,
    maxAverageUserEvalCp: _maxAverageUserEvalCp,
    maxPly: _maxPly,
    limit: _limit,
    minLossRate: _minLossRate,
    ...filters
  } = query;
  return filters;
}

function createNode(
  moveUci: string,
  movesUci: string[],
  parentKey: string | null,
  userColor: 'WHITE' | 'BLACK',
): OpeningStruggleNode {
  return {
    key: `${userColor}:${movesUci.join(' ')}`,
    moveUci,
    movesUci,
    ply: movesUci.length,
    parentKey,
    userColor,
    totalReachGameIds: new Set(),
    metricGameIds: new Set(),
    wins: 0,
    draws: 0,
    losses: 0,
    evalGames: 0,
    evalSumUserCp: 0,
    bestUserEvalCp: null,
    worstUserEvalCp: null,
    analysedMoveCount: 0,
    centipawnLossSum: 0,
    afterPositionAnalysisId: null,
    afterPositionNormalizedFen: null,
    afterPositionBestScoreCpWhite: null,
    afterPositionBestMateWhite: null,
    children: new Map(),
  };
}

function addResult(node: OpeningStruggleNode, resultForUser: string | null) {
  if (resultForUser === 'WIN') node.wins += 1;
  else if (resultForUser === 'DRAW') node.draws += 1;
  else if (resultForUser === 'LOSS') node.losses += 1;
}

function updateEval(node: OpeningStruggleNode, userEvalCp: number) {
  node.evalGames += 1;
  node.evalSumUserCp += userEvalCp;
  node.bestUserEvalCp = node.bestUserEvalCp === null ? userEvalCp : Math.max(node.bestUserEvalCp, userEvalCp);
  node.worstUserEvalCp = node.worstUserEvalCp === null ? userEvalCp : Math.min(node.worstUserEvalCp, userEvalCp);
}

function isOwnerMove(plyNumber: number, userColor: 'WHITE' | 'BLACK'): boolean {
  return userColor === 'WHITE' ? plyNumber % 2 === 1 : plyNumber % 2 === 0;
}

function buildTree(games: OpeningStrugglesGameRow[], query: OpeningStrugglesQuery) {
  const roots = new Map<string, OpeningStruggleNode>();

  for (const game of games) {
    if (game.userColor !== 'WHITE' && game.userColor !== 'BLACK') continue;
    const plies = [...game.plies].sort((left, right) => left.plyNumber - right.plyNumber);
    const colorRootKey = game.userColor;
    let colorRoot = roots.get(colorRootKey);
    if (!colorRoot) {
      colorRoot = createNode('', [], null, game.userColor);
      roots.set(colorRootKey, colorRoot);
    }
    let siblings = colorRoot.children;
    let parentKey: string | null = null;
    const movesUci: string[] = [];

    for (let index = 0; index < plies.length && index < query.maxPly; index += 1) {
      const ply = plies[index];
      movesUci.push(ply.moveUci);
      let node = siblings.get(ply.moveUci);
      if (!node) {
        node = createNode(ply.moveUci, [...movesUci], parentKey, game.userColor);
        siblings.set(ply.moveUci, node);
      }

      if (!node.totalReachGameIds.has(game.id)) {
        node.totalReachGameIds.add(game.id);
        const afterPosition = plies[index + 1]?.position ?? null;
        const analysis = afterPosition?.analysis ?? null;
        if (node.afterPositionNormalizedFen === null && afterPosition) {
          node.afterPositionNormalizedFen = afterPosition.normalizedFen;
        }
        if (node.afterPositionAnalysisId === null && analysis) {
          node.afterPositionAnalysisId = analysis.id;
          node.afterPositionBestScoreCpWhite = analysis.bestScoreCpWhite;
          node.afterPositionBestMateWhite = analysis.bestMateWhite;
        }

        const userEvalCp = userEvalCpFromWhiteEval(
          analysis?.bestScoreCpWhite,
          analysis?.bestMateWhite,
          game.userColor,
        );
        if (userEvalCp !== null) updateEval(node, userEvalCp);

        node.metricGameIds.add(game.id);
        addResult(node, game.resultForUser);

        if (isOwnerMove(ply.plyNumber, game.userColor) && ply.scoreLossCp !== null) {
          node.analysedMoveCount += 1;
          node.centipawnLossSum += ply.scoreLossCp;
        }
      }

      parentKey = node.key;
      siblings = node.children;
    }
  }

  return roots;
}

function toItem(node: OpeningStruggleNode) {
  const games = node.totalReachGameIds.size;
  return {
    key: node.key,
    parentKey: node.parentKey,
    userColor: node.userColor,
    movesUci: node.movesUci,
    ply: node.ply,
    analysisGameId: node.totalReachGameIds.values().next().value ?? null,
    totalReachGames: node.totalReachGameIds.size,
    metricGames: games,
    wins: node.wins,
    draws: node.draws,
    losses: node.losses,
    winRate: roundPercent(games > 0 ? (node.wins / games) * 100 : null),
    lossRate: roundPercent(games > 0 ? (node.losses / games) * 100 : null),
    scorePct: roundPercent(games > 0 ? ((node.wins + node.draws * 0.5) / games) * 100 : null),
    analysedMoveCount: node.analysedMoveCount,
    averageCentipawnLoss: node.analysedMoveCount > 0
      ? Math.round((node.centipawnLossSum / node.analysedMoveCount) * 10) / 10
      : null,
    evalGames: node.evalGames,
    avgUserEvalCp: node.evalGames > 0 ? Math.round(node.evalSumUserCp / node.evalGames) : null,
    bestUserEvalCp: node.bestUserEvalCp,
    worstUserEvalCp: node.worstUserEvalCp,
    afterPositionAnalysisId: node.afterPositionAnalysisId,
    afterPositionNormalizedFen: node.afterPositionNormalizedFen,
    afterPositionBestScoreCpWhite: node.afterPositionBestScoreCpWhite,
    afterPositionBestMateWhite: node.afterPositionBestMateWhite,
  };
}

function flatten(roots: Map<string, OpeningStruggleNode>, query: OpeningStrugglesQuery) {
  const items: Array<ReturnType<typeof toItem>> = [];

  function matchesBadPosition(item: ReturnType<typeof toItem>): boolean {
    return item.evalGames >= query.minEvaluatedGames
      && item.avgUserEvalCp !== null
      && item.avgUserEvalCp <= query.maxAverageUserEvalCp;
  }

  function visit(node: OpeningStruggleNode, parentMatchesBadPosition: boolean) {
    const item = toItem(node);
    const badPositionMatch = matchesBadPosition(item);
    const matches = query.mode === 'results'
      ? item.totalReachGames >= query.minGames
        && item.lossRate !== null
        && item.lossRate >= query.minLossRate
      : query.mode === 'repeatedMistakes'
        ? item.analysedMoveCount >= query.minOccurrences
          && item.averageCentipawnLoss !== null
          && item.averageCentipawnLoss >= query.minAverageCentipawnLoss
        : badPositionMatch && !parentMatchesBadPosition;
    if (matches) {
      items.push(item);
    }
    for (const child of node.children.values()) visit(child, badPositionMatch);
  }

  for (const root of roots.values()) {
    for (const child of root.children.values()) visit(child, false);
  }
  return items;
}

function sortItems(items: ReturnType<typeof toItem>[], query: OpeningStrugglesQuery) {
  return items.sort((left, right) => {
    if (query.mode === 'badPositions') {
      return (left.avgUserEvalCp ?? Number.POSITIVE_INFINITY)
          - (right.avgUserEvalCp ?? Number.POSITIVE_INFINITY)
        || right.evalGames - left.evalGames
        || left.key.localeCompare(right.key);
    }
    const colorOrder = (left.userColor === 'WHITE' ? 0 : 1) - (right.userColor === 'WHITE' ? 0 : 1);
    if (colorOrder !== 0) return colorOrder;
    if (query.mode === 'results' && left.lossRate !== right.lossRate) {
      return (right.lossRate ?? -1) - (left.lossRate ?? -1);
    }
    if (query.mode === 'repeatedMistakes' && left.averageCentipawnLoss !== right.averageCentipawnLoss) {
      return (right.averageCentipawnLoss ?? -1) - (left.averageCentipawnLoss ?? -1);
    }
    const leftCount = query.mode === 'results' ? left.totalReachGames : left.analysedMoveCount;
    const rightCount = query.mode === 'results' ? right.totalReachGames : right.analysedMoveCount;
    return rightCount - leftCount || right.ply - left.ply || left.key.localeCompare(right.key);
  });
}

export async function getOpeningStruggles(userId: number, query: OpeningStrugglesQuery) {
  const filters = importedGameFilters(query);
  const candidateGames = await findImportedGamesForOpeningStruggles(userId, filters, query.maxPly);
  const filteredGames = candidateGames;
  const indexedGames = filteredGames.filter((game) => game.plyIndexedAt !== null);
  const items = buildOpeningStruggleItems(indexedGames, query);

  return {
    totalFilteredGames: filteredGames.length,
    indexedFilteredGames: indexedGames.length,
    maxPly: query.maxPly,
    limit: query.limit,
    mode: query.mode,
    ...(query.mode === 'results'
      ? { minGames: query.minGames, minLossRate: query.minLossRate }
      : query.mode === 'repeatedMistakes'
        ? {
            minOccurrences: query.minOccurrences,
            minAverageCentipawnLoss: query.minAverageCentipawnLoss,
          }
        : {
            minEvaluatedGames: query.minEvaluatedGames,
            maxAverageUserEvalCp: query.maxAverageUserEvalCp,
          }),
    items,
  };
}

export function buildOpeningStruggleItems(
  games: OpeningStrugglesGameRow[],
  query: OpeningStrugglesQuery,
) {
  return sortItems(flatten(buildTree(games, query), query), query).slice(0, query.limit);
}
