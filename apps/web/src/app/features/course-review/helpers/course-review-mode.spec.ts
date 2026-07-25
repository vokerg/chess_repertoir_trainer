import { courseReviewModeFromQuery, courseReviewModeToQuery } from './course-review-mode';

describe('course review mode query mapping', () => {
  it('uses my deviations by default', () => {
    expect(courseReviewModeFromQuery(null)).toBe('MY_DEVIATIONS');
  });

  it('maps every supported query value', () => {
    expect(courseReviewModeFromQuery('my-deviations')).toBe('MY_DEVIATIONS');
    expect(courseReviewModeFromQuery('opponent-gaps')).toBe('OPPONENT_GAPS');
    expect(courseReviewModeFromQuery('course-endings')).toBe('COURSE_ENDINGS');
  });

  it('falls back for unsupported query values', () => {
    expect(courseReviewModeFromQuery('unknown')).toBe('MY_DEVIATIONS');
  });

  it('serializes every mode', () => {
    expect(courseReviewModeToQuery('MY_DEVIATIONS')).toBe('my-deviations');
    expect(courseReviewModeToQuery('OPPONENT_GAPS')).toBe('opponent-gaps');
    expect(courseReviewModeToQuery('COURSE_ENDINGS')).toBe('course-endings');
  });
});
