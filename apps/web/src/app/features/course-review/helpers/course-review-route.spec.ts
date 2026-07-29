import { convertToParamMap } from '@angular/router';
import { defaultGameFilters } from '../../../shared/games/filters/game-filter.model';
import { parseCourseReviewRestoredScope } from './course-review-route';

describe('Course review restored route scope', () => {
  it('restores applied game filters and the ending threshold', () => {
    const restored = parseCourseReviewRestoredScope(convertToParamMap({
      restore: '1',
      minGames: '8',
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-30T23:59:59.999Z',
      userColor: 'WHITE',
      speedCategory: 'blitz,rapid',
      minAccuracy: '70',
    }), defaultGameFilters());

    expect(restored).not.toBeNull();
    expect(restored?.minGames).toBe(8);
    expect(restored?.gameFilters).toEqual(jasmine.objectContaining({
      from: '2026-06-01',
      to: '2026-06-30',
      userColor: 'WHITE',
      speedCategory: 'blitz,rapid',
      minAccuracy: '70',
    }));
  });

  it('ignores ordinary Course review routes', () => {
    expect(parseCourseReviewRestoredScope(
      convertToParamMap({ view: 'endings' }),
      defaultGameFilters(),
    )).toBeNull();
  });
});
