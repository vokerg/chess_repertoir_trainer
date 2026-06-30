import {
  findImportedGamesForOpeningStruggles,
  OpeningStrugglesGameRow,
} from '../../imported-games/imported-games.repository.prisma';
import { ImportedGameSummaryQuery } from '../../imported-games/imported-games.schemas';
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
  evalBadGames: number;
  evalSumUserCp: number;
  bestUserEvalCp: number | null;
  worstUserEvalCp: number | null;
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
    maxPly: _maxPly,
    limit: _limit,
    resultMetric: _resultMetric,
    minLossRate: _minLossRate,
    maxWinRate: _maxWinRate,
    maxScorePct: _maxScorePct,
    evalMetric: _evalMetric,
    maxUserEvalCp: _maxUserEvalCp,
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
    evalBadGames: 0,
    evalSumUserCp: 0,
    bestUserEvalCp: null,
    worstUserEvalCp: null,
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

function updateEval(node: OpeningStruggleNode, userEvalCp: number, maxUserEvalCp: number) {
  node.evalGames += 1;
  node.evalSumUserCp += userEvalCp;
  if (userEvalCp <= maxUserEvalCp) node.evalBadGames += 1;
  node.bestUserEvalCp = node.bestUserEvalCp === null ? userEvalCp : Math.max(node.bestUserEvalCp, userEvalCp);
  node.worstUserEvalCp = node.worstUserEvalCp === null ? userEvalCp : Math.min(node.worstUserEvalCp, userEvalCp);
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
        if (userEvalCp !== null) updateEval(node, userEvalCp, query.maxUserEvalCp);

        const metricEligible = query.evalMetric === 'none'
          || (userEvalCp !== null && userEvalCp <= query.maxUserEvalCp);
        if (metricEligible) {
          node.metricGameIds.add(game.id);
          addResult(node, game.resultForUser);
        }
      }

      parentKey = node.key;
      siblings = node.children;
    }
  }

  return roots;
}

function resultMetricPasses(
  query: OpeningStrugglesQuery,
  lossRate: number | null,
  winRate: number | null,
  resultScorePct: number | null,
) {
  if (query.resultMetric === 'none') return true;
  if (query.resultMetric === 'lossRate') return lossRate !== null && lossRate >= query.minLossRate;
  if (query.resultMetric === 'winRate') {
    return query.maxWinRate !== undefined && winRate !== null && winRate <= query.maxWinRate;
  }
  return query.maxScorePct !== undefined && resultScorePct !== null && resultScorePct <= query.maxScorePct;
}

function toItem(node: OpeningStruggleNode) {
  const games = node.metricGameIds.size;
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
    evalGames: node.evalGames,
    evalBadGames: node.evalBadGames,
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

  function visit(node: OpeningStruggleNode) {
    const item = toItem(node);
    if (
      item.metricGames >= query.minGames
      && resultMetricPasses(query, item.lossRate, item.winRate, item.scorePct)
    ) {
      items.push(item);
    }
    for (const child of node.children.values()) visit(child);
  }

  for (const root of roots.values()) {
    for (const child of root.children.values()) visit(child);
  }
  return items;
}

function sortItems(items: ReturnType<typeof toItem>[], query: OpeningStrugglesQuery) {
  return items.sort((left, right) => {
    const colorOrder = (left.userColor === 'WHITE' ? 0 : 1) - (right.userColor === 'WHITE' ? 0 : 1);
    if (colorOrder !== 0) return colorOrder;
    if (query.resultMetric === 'lossRate' && left.lossRate !== right.lossRate) {
      return (right.lossRate ?? -1) - (left.lossRate ?? -1);
    }
    if (query.resultMetric === 'scorePct' && left.scorePct !== right.scorePct) {
      return (left.scorePct ?? 101) - (right.scorePct ?? 101);
    }
    if (query.resultMetric === 'winRate' && left.winRate !== right.winRate) {
      return (left.winRate ?? 101) - (right.winRate ?? 101);
    }
    if (query.evalMetric === 'userEvalCp' && left.avgUserEvalCp !== right.avgUserEvalCp) {
      return (left.avgUserEvalCp ?? Number.POSITIVE_INFINITY)
        - (right.avgUserEvalCp ?? Number.POSITIVE_INFINITY);
    }
    return right.metricGames - left.metricGames || right.ply - left.ply || left.key.localeCompare(right.key);
  });
}

export async function getOpeningStruggles(userId: number, query: OpeningStrugglesQuery) {
  const filters = importedGameFilters(query);
  const candidateGames = await findImportedGamesForOpeningStruggles(userId, filters, query.maxPly);
  const filteredGames = candidateGames;
  const indexedGames = filteredGames.filter((game) => game.plyIndexedAt !== null);
  const items = sortItems(flatten(buildTree(indexedGames, query), query), query).slice(0, query.limit);

  return {
    totalFilteredGames: filteredGames.length,
    indexedFilteredGames: indexedGames.length,
    minGames: query.minGames,
    maxPly: query.maxPly,
    limit: query.limit,
    resultMetric: query.resultMetric,
    evalMetric: query.evalMetric,
    ...(query.resultMetric === 'lossRate' ? { minLossRate: query.minLossRate } : {}),
    ...(query.resultMetric === 'winRate' ? { maxWinRate: query.maxWinRate } : {}),
    ...(query.resultMetric === 'scorePct' ? { maxScorePct: query.maxScorePct } : {}),
    ...(query.evalMetric === 'userEvalCp' ? { maxUserEvalCp: query.maxUserEvalCp } : {}),
    items,
  };
}
