import { defaultGameFilters } from '../../../shared/games/filters/game-filter.model';
import { OpeningStrugglesCriteria } from '../data-access/opening-struggles.models';
import { buildOpeningStrugglesQuery } from './opening-struggles-query';

const criteria: OpeningStrugglesCriteria = {
  mode: 'results',
  minGames: 5,
  minLossRate: 60,
  minOccurrences: 4,
  minAverageCentipawnLoss: 90,
  minEvaluatedGames: 6,
  maxAverageUserEvalCp: -125,
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
    expect(params.has('minOccurrences')).toBeFalse();
    expect(params.has('minAverageCentipawnLoss')).toBeFalse();
    expect(params.has('minEvaluatedGames')).toBeFalse();
    expect(params.has('maxAverageUserEvalCp')).toBeFalse();
  });

  it('only includes repeated-mistake thresholds in repeated-mistakes mode', () => {
    const params = new URLSearchParams(buildOpeningStrugglesQuery(defaultGameFilters(), {
      ...criteria,
      mode: 'repeatedMistakes',
    }));

    expect(params.get('mode')).toBe('repeatedMistakes');
    expect(params.get('minOccurrences')).toBe('4');
    expect(params.get('minAverageCentipawnLoss')).toBe('90');
    expect(params.has('minGames')).toBeFalse();
    expect(params.has('minLossRate')).toBeFalse();
    expect(params.has('minEvaluatedGames')).toBeFalse();
    expect(params.has('maxAverageUserEvalCp')).toBeFalse();
  });

  it('only includes evaluation thresholds in bad-positions mode', () => {
    const params = new URLSearchParams(buildOpeningStrugglesQuery(defaultGameFilters(), {
      ...criteria,
      mode: 'badPositions',
    }));

    expect(params.get('mode')).toBe('badPositions');
    expect(params.get('minEvaluatedGames')).toBe('6');
    expect(params.get('maxAverageUserEvalCp')).toBe('-125');
    expect(params.has('minGames')).toBeFalse();
    expect(params.has('minOccurrences')).toBeFalse();
    expect(params.has('minAverageCentipawnLoss')).toBeFalse();
  });
});
