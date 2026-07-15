import { defaultGameFilters } from '../../../shared/games/filters/game-filter.model';
import { OpeningStrugglesCriteria } from '../data-access/opening-struggles.models';
import { buildOpeningStrugglesQuery } from './opening-struggles-query';

const criteria: OpeningStrugglesCriteria = {
  mode: 'results',
  minGames: 5,
  minLossRate: 60,
  minAnalysedGames: 4,
  minAverageCentipawnLoss: 90,
  openingDepth: 12,
  limit: 80,
};

describe('buildOpeningStrugglesQuery', () => {
  it('serializes full-move depth as maxPly and only includes result thresholds', () => {
    const params = new URLSearchParams(buildOpeningStrugglesQuery(defaultGameFilters(), criteria));

    expect(params.get('mode')).toBe('results');
    expect(params.get('maxPly')).toBe('24');
    expect(params.get('minGames')).toBe('5');
    expect(params.get('minLossRate')).toBe('60');
    expect(params.has('minAnalysedGames')).toBeFalse();
    expect(params.has('minAverageCentipawnLoss')).toBeFalse();
  });

  it('only includes move-quality thresholds in move-quality mode', () => {
    const params = new URLSearchParams(buildOpeningStrugglesQuery(defaultGameFilters(), {
      ...criteria,
      mode: 'moveQuality',
    }));

    expect(params.get('mode')).toBe('moveQuality');
    expect(params.get('minAnalysedGames')).toBe('4');
    expect(params.get('minAverageCentipawnLoss')).toBe('90');
    expect(params.has('minGames')).toBeFalse();
    expect(params.has('minLossRate')).toBeFalse();
  });
});
