import type { CourseReviewResponse } from '../data-access/course-review.models';
import { summaryAppliedCourseReviewFilters } from './course-review-filter-summary';

describe('applied Course review filter summary', () => {
  it('uses the applied response scope rather than draft panel state', () => {
    const filters: CourseReviewResponse['filters'] = {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-30T23:59:59.999Z',
      accountIds: [7],
      providers: ['LICHESS'],
      userColor: ['BLACK'],
      speedCategory: ['blitz', 'rapid'],
      rated: true,
      minOpponentRating: 1800,
      limit: 100,
      offset: 0,
      minCoveredPlies: 4,
    };

    expect(summaryAppliedCourseReviewFilters(filters)).toBe(
      'Black - blitz + rapid - Rated - Opponent 1800+ - Selected account',
    );
  });

  it('describes broad applied scope explicitly', () => {
    const filters: CourseReviewResponse['filters'] = {
      from: '2026-06-01T00:00:00.000Z',
      limit: 100,
      offset: 0,
      minCoveredPlies: 2,
    };

    expect(summaryAppliedCourseReviewFilters(filters)).toBe(
      'Either colour - Any speed - Rated or casual',
    );
  });
});
