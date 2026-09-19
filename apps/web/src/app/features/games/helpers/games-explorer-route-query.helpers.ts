import type { ParamMap } from '@angular/router';
import type { ImportedGameSearchQuery } from '@chess-trainer/contracts/imported-games';
import { defaultGameFilters, type GameFilters } from '../../../shared/games/filters/game-filter.model';
import {
  canonicalizeImportedGameSearchQuery,
  parseImportedGameSearchQueryOverrides,
  serializeImportedGameSearchQuery,
  type ImportedGameSearchCriteria,
} from '../../../shared/games/filters/imported-game-search-query.codec';

export type GamesExplorerFilterMode = 'defaults' | 'explicit';

export interface GamesExplorerRouteQuery {
  filterMode: GamesExplorerFilterMode;
  query: ImportedGameSearchCriteria;
}

export function parseGamesExplorerRouteQuery(
  params: ParamMap,
  now = new Date(),
): GamesExplorerRouteQuery {
  const filterMode: GamesExplorerFilterMode =
    params.get('filterMode') === 'explicit' ? 'explicit' : 'defaults';
  const base = filterMode === 'explicit'
    ? canonicalCriteria({})
    : defaultGamesExplorerQuery(now);
  const overrides = parseImportedGameSearchQueryOverrides(params);
  const { cursor: _cursor, ...durableOverrides } = overrides;

  return {
    filterMode,
    query: canonicalCriteria({ ...base, ...durableOverrides }),
  };
}

export function defaultGamesExplorerQuery(now = new Date()): ImportedGameSearchCriteria {
  return gameFiltersAsCanonicalQuery(defaultGameFilters(now));
}

export function projectGamesExplorerFilters(query: ImportedGameSearchCriteria): GameFilters {
  return {
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

export function patchGamesExplorerDraftQuery(
  query: ImportedGameSearchCriteria,
  previousFilters: GameFilters,
  nextFilters: GameFilters,
): ImportedGameSearchCriteria {
  const next: Partial<ImportedGameSearchQuery> = { ...query };

  if (nextFilters.accountId !== previousFilters.accountId) {
    next.accountIds = positiveIntegerArray(nextFilters.accountId);
  }
  if (nextFilters.provider !== previousFilters.provider) {
    next.providers = nextFilters.provider && nextFilters.provider !== 'ALL'
      ? [nextFilters.provider]
      : undefined;
  }
  if (nextFilters.resultForUser !== previousFilters.resultForUser) {
    next.resultForUser = nextFilters.resultForUser ? [nextFilters.resultForUser] : undefined;
  }
  if (nextFilters.userColor !== previousFilters.userColor) {
    next.userColor = nextFilters.userColor ? [nextFilters.userColor] : undefined;
  }
  if (nextFilters.speedCategory !== previousFilters.speedCategory) {
    next.speedCategory = csvStrings(nextFilters.speedCategory);
  }
  if (nextFilters.rated !== previousFilters.rated) {
    next.rated = nextFilters.rated === '' ? undefined : nextFilters.rated === 'true';
  }
  if (nextFilters.timeControl !== previousFilters.timeControl) {
    next.timeControl = trimmed(nextFilters.timeControl);
  }
  if (nextFilters.opponent !== previousFilters.opponent) {
    next.opponent = trimmed(nextFilters.opponent);
  }
  if (nextFilters.openingName !== previousFilters.openingName) {
    next.openingName = trimmed(nextFilters.openingName);
  }
  if (nextFilters.analysisStatus !== previousFilters.analysisStatus) {
    next.analysisStatus = nextFilters.analysisStatus ? [nextFilters.analysisStatus] : undefined;
  }
  if (nextFilters.plyIndexStatus !== previousFilters.plyIndexStatus) {
    next.plyIndexStatus = nextFilters.plyIndexStatus ? [nextFilters.plyIndexStatus] : undefined;
  }
  if (nextFilters.tagFilter !== previousFilters.tagFilter) {
    next.tagFilter = nextFilters.tagFilter || undefined;
  }
  if (!numberArraysEqual(nextFilters.tagCodes, previousFilters.tagCodes)) {
    next.tagCodes = nextFilters.tagCodes.length ? [...nextFilters.tagCodes] : undefined;
  }
  if (nextFilters.minAccuracy !== previousFilters.minAccuracy) {
    next.minAccuracy = boundedNumber(nextFilters.minAccuracy, 0, 100);
  }
  if (nextFilters.maxAccuracy !== previousFilters.maxAccuracy) {
    next.maxAccuracy = boundedNumber(nextFilters.maxAccuracy, 0, 100);
  }
  if (nextFilters.minOpponentRating !== previousFilters.minOpponentRating) {
    next.minOpponentRating = nonnegativeInteger(nextFilters.minOpponentRating);
  }
  if (nextFilters.maxOpponentRating !== previousFilters.maxOpponentRating) {
    next.maxOpponentRating = nonnegativeInteger(nextFilters.maxOpponentRating);
  }
  if (nextFilters.from !== previousFilters.from) {
    next.from = nextFilters.from ? `${nextFilters.from}T00:00:00.000Z` : undefined;
  }
  if (nextFilters.to !== previousFilters.to) {
    next.to = nextFilters.to ? `${nextFilters.to}T23:59:59.999Z` : undefined;
  }

  return canonicalCriteria(next);
}

export function summarizeUnrepresentedGamesExplorerCriteria(
  query: ImportedGameSearchCriteria,
): readonly string[] {
  const summary: string[] = [];
  addMultiValue(summary, 'Accounts', query.accountIds);
  addMultiValue(summary, 'Providers', query.providers);
  addMultiValue(summary, 'Results', query.resultForUser);
  addMultiValue(summary, 'Colours', query.userColor);
  if (query.speedCategory && query.speedCategory.length > 1 &&
      query.speedCategory.join(',') !== 'blitz,rapid') {
    summary.push(`Controls: ${query.speedCategory.join(', ')}`);
  }
  addMultiValue(summary, 'Analysis', query.analysisStatus);
  addMultiValue(summary, 'Index status', query.plyIndexStatus);
  addValues(summary, 'Variants', query.variant);
  addValues(summary, 'Opening ECO', query.openingEco);
  addValues(summary, 'Classifications', query.classification);
  if (query.minUserRating !== undefined) summary.push(`User rating ≥ ${query.minUserRating}`);
  if (query.maxUserRating !== undefined) summary.push(`User rating ≤ ${query.maxUserRating}`);
  if (query.from?.includes('T') && !query.from.endsWith('T00:00:00.000Z')) {
    summary.push(`Exact start: ${query.from}`);
  }
  if (query.to?.includes('T') && !query.to.endsWith('T23:59:59.999Z')) {
    summary.push(`Exact end: ${query.to}`);
  }
  if (query.sort !== 'endedAtDesc') summary.push('Sort: oldest first');
  if (query.limit !== 50) summary.push(`Page size: ${query.limit}`);
  return summary;
}

export function serializeGamesExplorerRouteQuery(query: ImportedGameSearchCriteria): string {
  const params = serializeImportedGameSearchQuery(query);
  params.set('filterMode', 'explicit');
  params.sort();
  return params.toString();
}

export function gamesExplorerRouteQueriesEqual(
  left: GamesExplorerRouteQuery,
  right: GamesExplorerRouteQuery,
): boolean {
  return stableCriteriaSerialization(left.query) === stableCriteriaSerialization(right.query);
}

export function importedGameSearchCriteriaEqual(
  left: ImportedGameSearchCriteria,
  right: ImportedGameSearchCriteria,
): boolean {
  return stableCriteriaSerialization(left) === stableCriteriaSerialization(right);
}

function gameFiltersAsCanonicalQuery(filters: GameFilters): ImportedGameSearchCriteria {
  return canonicalCriteria({
    accountIds: positiveIntegerArray(filters.accountId),
    providers: filters.provider && filters.provider !== 'ALL' ? [filters.provider] : undefined,
    resultForUser: filters.resultForUser ? [filters.resultForUser] : undefined,
    userColor: filters.userColor ? [filters.userColor] : undefined,
    speedCategory: csvStrings(filters.speedCategory),
    rated: filters.rated === '' ? undefined : filters.rated === 'true',
    timeControl: trimmed(filters.timeControl),
    opponent: trimmed(filters.opponent),
    openingName: trimmed(filters.openingName),
    analysisStatus: filters.analysisStatus ? [filters.analysisStatus] : undefined,
    plyIndexStatus: filters.plyIndexStatus ? [filters.plyIndexStatus] : undefined,
    tagFilter: filters.tagFilter || undefined,
    tagCodes: filters.tagCodes.length ? filters.tagCodes : undefined,
    minAccuracy: boundedNumber(filters.minAccuracy, 0, 100),
    maxAccuracy: boundedNumber(filters.maxAccuracy, 0, 100),
    minOpponentRating: nonnegativeInteger(filters.minOpponentRating),
    maxOpponentRating: nonnegativeInteger(filters.maxOpponentRating),
    from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
    to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
  });
}

function canonicalCriteria(query: Partial<ImportedGameSearchQuery>): ImportedGameSearchCriteria {
  const { cursor: _cursor, ...criteria } = canonicalizeImportedGameSearchQuery(query);
  return criteria;
}

function stableCriteriaSerialization(query: ImportedGameSearchCriteria): string {
  return serializeImportedGameSearchQuery(query).toString();
}

function singleValue<T>(values: readonly T[] | undefined): T | undefined {
  return values?.length === 1 ? values[0] : undefined;
}

function csvStrings(value: string): string[] | undefined {
  const values = value.split(',').map((item) => item.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

function positiveIntegerArray(value: string): number[] | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? [parsed] : undefined;
}

function nonnegativeInteger(value: string): number | undefined {
  const parsed = Number(value);
  return value.trim() && Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function boundedNumber(value: string, min: number, max: number): number | undefined {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : undefined;
}

function trimmed(value: string): string | undefined {
  return value.trim() || undefined;
}

function numberInput(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function dateInput(value: string | undefined): string {
  return value?.slice(0, 10) ?? '';
}

function numberArraysEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function addMultiValue<T>(summary: string[], label: string, values: readonly T[] | undefined): void {
  if (values && values.length > 1) summary.push(`${label}: ${values.join(', ')}`);
}

function addValues<T>(summary: string[], label: string, values: readonly T[] | undefined): void {
  if (values?.length) summary.push(`${label}: ${values.join(', ')}`);
}
