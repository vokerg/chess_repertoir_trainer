import type { ParamMap } from '@angular/router';
import type { ImportedGameSearchQuery } from '@chess-trainer/contracts/imported-games';
import type { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { parseImportedGameSearchQueryOverrides } from '../../../shared/games/filters/imported-game-search-query.codec';

export interface CourseReviewRestoredScope {
  gameFilters: GameFilters;
  minGames: number;
}

export function parseCourseReviewRestoredScope(
  params: ParamMap,
  baseFilters: GameFilters,
): CourseReviewRestoredScope | null {
  if (params.get('restore') !== '1') return null;
  const query = parseImportedGameSearchQueryOverrides(params);
  const minGames = boundedInteger(params.get('minGames'), 1, 1000) ?? 4;

  return {
    gameFilters: projectFilters(baseFilters, query),
    minGames,
  };
}

function projectFilters(
  base: GameFilters,
  query: Partial<ImportedGameSearchQuery>,
): GameFilters {
  return {
    ...base,
    accountId: singleValue(query.accountIds)?.toString() ?? '',
    provider: singleValue(query.providers) ?? 'ALL',
    resultForUser: singleValue(query.resultForUser) ?? '',
    userColor: singleValue(query.userColor) ?? '',
    speedCategory: query.speedCategory?.join(',') ?? '',
    rated: query.rated === undefined ? '' : (String(query.rated) as 'true' | 'false'),
    timeControl: query.timeControl ?? '',
    opponent: query.opponent ?? '',
    openingNameExact: '',
    openingName: query.openingName ?? '',
    analysisStatus: singleValue(query.analysisStatus) ?? '',
    plyIndexStatus: singleValue(query.plyIndexStatus) ?? '',
    tagFilter: query.tagFilter ?? '',
    tagCodes: query.tagCodes ?? [],
    minAccuracy: numberInput(query.minAccuracy),
    maxAccuracy: numberInput(query.maxAccuracy),
    minOpponentRating: numberInput(query.minOpponentRating),
    maxOpponentRating: numberInput(query.maxOpponentRating),
    from: dateInput(query.from),
    to: dateInput(query.to),
  };
}

function singleValue<T>(values: readonly T[] | undefined): T | undefined {
  return values?.length === 1 ? values[0] : undefined;
}

function numberInput(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function dateInput(value: string | undefined): string {
  return value?.slice(0, 10) ?? '';
}

function boundedInteger(value: string | null, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
