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
  } else {
    params.set('minAnalysedGames', String(criteria.minAnalysedGames));
    params.set('minAverageCentipawnLoss', String(criteria.minAverageCentipawnLoss));
  }
  return params.toString();
}
