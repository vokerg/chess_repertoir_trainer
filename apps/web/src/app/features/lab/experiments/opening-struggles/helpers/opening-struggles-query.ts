import { GameFilters } from '../../../../../shared/game-filters/game-filter.model';
import { appendGameFilterParams } from '../../../../../shared/game-filters/game-filter-query.mapper';
import { OpeningStrugglesCriteria } from '../data-access/opening-struggles.models';

export function buildOpeningStrugglesQuery(
  gameFilters: GameFilters,
  criteria: OpeningStrugglesCriteria,
): string {
  const params = new URLSearchParams({
    minGames: String(criteria.minGames),
    maxPly: String(criteria.maxPly),
    limit: String(criteria.limit),
    resultMetric: criteria.resultMetric,
    evalMetric: criteria.evalMetric,
  });

  appendGameFilterParams(params, gameFilters);
  if (criteria.resultMetric === 'lossRate') params.set('minLossRate', String(criteria.minLossRate));
  if (criteria.resultMetric === 'winRate') params.set('maxWinRate', String(criteria.maxWinRate));
  if (criteria.resultMetric === 'scorePct') params.set('maxScorePct', String(criteria.maxScorePct));
  if (criteria.evalMetric === 'userEvalCp')
    params.set('maxUserEvalCp', String(criteria.maxUserEvalCp));
  return params.toString();
}
