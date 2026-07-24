export type CourseReviewMode = 'MY_DEVIATIONS' | 'OPPONENT_GAPS' | 'COURSE_ENDINGS';

export interface CourseReviewModeTab {
  id: CourseReviewMode;
  label: string;
  count: number | null;
}

const queryValueByMode: Record<CourseReviewMode, string> = {
  MY_DEVIATIONS: 'my-deviations',
  OPPONENT_GAPS: 'opponent-gaps',
  COURSE_ENDINGS: 'course-endings',
};

const modeByQueryValue = new Map(
  Object.entries(queryValueByMode).map(([mode, value]) => [value, mode as CourseReviewMode]),
);

export function courseReviewModeFromQuery(value: string | null): CourseReviewMode {
  return (value && modeByQueryValue.get(value)) || 'MY_DEVIATIONS';
}

export function courseReviewModeToQuery(mode: CourseReviewMode): string {
  return queryValueByMode[mode];
}
