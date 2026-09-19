import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { appendGameFilterParams } from '../../../shared/games/filters/game-filter-query.mapper';
import { OpeningStrugglesCriteria } from '../data-access/opening-struggles.models';

export function buildOpeningStrugglesQuery(
  gameFilters: GameFilters,
  criteria: OpeningStrugglesCriteria,
): string {
  const params = new URLSearchParams({
    mode: criteria.mode,
    maxPly: String(criteria.openingDepth * 2),
    limit: String(criteria.limit),
  });

  appendGameFilterParams(params, gameFilters);
  if (criteria.mode === 'results') {
    params.set('minGames', String(criteria.minGames));
    params.set('minLossRate', String(criteria.minLossRate));
  } else if (criteria.mode === 'repeatedMistakes') {
    params.set('minOccurrences', String(criteria.minOccurrences));
    params.set('minAverageCentipawnLoss', String(criteria.minAverageCentipawnLoss));
  } else {
    params.set('minEvaluatedGames', String(criteria.minEvaluatedGames));
    params.set('maxAverageUserEvalCp', String(criteria.maxAverageUserEvalCp));
  }
  return params.toString();
}
