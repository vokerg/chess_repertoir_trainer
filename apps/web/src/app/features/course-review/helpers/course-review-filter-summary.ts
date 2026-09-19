import { defaultGameFilters, type GameFilters } from '../../../shared/games/filters/game-filter.model';
import { summaryGameFilters } from '../../../shared/games/filters/game-filter-summary';
import type { CourseReviewResponse } from '../data-access/course-review.models';

export function summaryAppliedCourseReviewFilters(
  filters: CourseReviewResponse['filters'],
): string {
  return summaryGameFilters(projectAppliedFilters(filters));
}

function projectAppliedFilters(filters: CourseReviewResponse['filters']): GameFilters {
  return {
    ...defaultGameFilters(),
    accountId: singleValue(filters.accountIds)?.toString() ?? '',
    provider: singleValue(filters.providers) ?? 'ALL',
    resultForUser: singleValue(filters.resultForUser) ?? '',
    userColor: singleValue(filters.userColor) ?? '',
    speedCategory: filters.speedCategory?.join(',') ?? '',
    rated: filters.rated === undefined ? '' : String(filters.rated) as 'true' | 'false',
    timeControl: filters.timeControl ?? '',
    opponent: filters.opponent ?? '',
    openingNameExact: '',
    openingName: filters.openingName ?? '',
    analysisStatus: singleValue(filters.analysisStatus) ?? '',
    plyIndexStatus: singleValue(filters.plyIndexStatus) ?? '',
    minAccuracy: numberInput(filters.minAccuracy),
    maxAccuracy: numberInput(filters.maxAccuracy),
    minOpponentRating: numberInput(filters.minOpponentRating),
    maxOpponentRating: numberInput(filters.maxOpponentRating),
    from: filters.from.slice(0, 10),
    to: filters.to?.slice(0, 10) ?? '',
  };
}

function singleValue<T>(values: readonly T[] | undefined): T | undefined {
  return values?.length === 1 ? values[0] : undefined;
}

function numberInput(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}
