import {
  canonicalizeImportedGameSearchQuery,
  serializeImportedGameSearchQuery,
  type ImportedGameSearchCriteria,
} from '../filters/imported-game-search-query.codec';

export type GamesExplorerLinkQueryParams = Readonly<Record<string, string>> & {
  readonly filterMode: 'explicit';
};

export function gamesExplorerLinkQueryParams(
  criteria: Partial<ImportedGameSearchCriteria>,
): GamesExplorerLinkQueryParams {
  const canonical = canonicalizeImportedGameSearchQuery(criteria);
  const params = serializeImportedGameSearchQuery(canonical);
  const angularParams: Record<string, string> = {};
  params.forEach((value, key) => angularParams[key] = value);
  return {
    filterMode: 'explicit',
    ...angularParams,
  };
}
