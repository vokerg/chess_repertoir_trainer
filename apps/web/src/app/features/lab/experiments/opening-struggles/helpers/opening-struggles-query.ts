import { GameFilters } from '../../../../../shared/game-filters/game-filter.model';
import { OpeningStrugglesCriteria } from '../data-access/opening-struggles.models';

export function buildOpeningStrugglesQuery(gameFilters: GameFilters, criteria: OpeningStrugglesCriteria): string {
  const params = new URLSearchParams({
    minGames: String(criteria.minGames),
    maxPly: String(criteria.maxPly),
    limit: String(criteria.limit),
    resultMetric: criteria.resultMetric,
    evalMetric: criteria.evalMetric,
  });

  setParam(params, 'accountIds', gameFilters.accountId);
  setParam(params, 'providers', gameFilters.provider === 'ALL' ? '' : gameFilters.provider);
  setParam(params, 'resultForUser', gameFilters.resultForUser);
  setParam(params, 'userColor', gameFilters.userColor);
  setParam(params, 'speedCategory', gameFilters.speedCategory);
  setParam(params, 'rated', gameFilters.rated);
  setParam(params, 'timeControl', gameFilters.timeControl.trim());
  setParam(params, 'opponent', gameFilters.opponent.trim());
  setParam(params, 'openingName', gameFilters.openingName.trim());
  setParam(params, 'analysisStatus', gameFilters.analysisStatus);
  setParam(params, 'plyIndexStatus', gameFilters.plyIndexStatus);
  setParam(params, 'minAccuracy', gameFilters.minAccuracy.trim());
  setParam(params, 'maxAccuracy', gameFilters.maxAccuracy.trim());
  setParam(params, 'minOpponentRating', gameFilters.minOpponentRating.trim());
  setParam(params, 'maxOpponentRating', gameFilters.maxOpponentRating.trim());
  setParam(params, 'from', gameFilters.from ? `${gameFilters.from}T00:00:00.000Z` : '');
  setParam(params, 'to', gameFilters.to ? `${gameFilters.to}T23:59:59.999Z` : '');
  if (criteria.resultMetric === 'lossRate') params.set('minLossRate', String(criteria.minLossRate));
  if (criteria.resultMetric === 'winRate') params.set('maxWinRate', String(criteria.maxWinRate));
  if (criteria.resultMetric === 'scorePct') params.set('maxScorePct', String(criteria.maxScorePct));
  if (criteria.evalMetric === 'userEvalCp') params.set('maxUserEvalCp', String(criteria.maxUserEvalCp));
  return params.toString();
}

function setParam(params: URLSearchParams, key: string, value: string): void {
  if (value) params.set(key, value);
}
