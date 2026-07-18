import {
  importedGameSearchQuerySchema,
  type ImportedGameSearchQuery,
} from '@chess-trainer/contracts/imported-games';

export type ImportedGameSearchCriteria = Omit<ImportedGameSearchQuery, 'cursor'>;

export interface QueryParameterSource {
  get(name: string): string | null;
}

export interface ImportedGameSearchSerializationOptions {
  cursor?: string | null;
}

export const importedGameSearchQueryKeys = [
  'accountIds',
  'providers',
  'from',
  'to',
  'resultForUser',
  'userColor',
  'rated',
  'speedCategory',
  'variant',
  'openingEco',
  'openingName',
  'opponent',
  'timeControl',
  'minUserRating',
  'maxUserRating',
  'minOpponentRating',
  'maxOpponentRating',
  'analysisStatus',
  'plyIndexStatus',
  'tagFilter',
  'tagCodes',
  'classification',
  'minAccuracy',
  'maxAccuracy',
  'sort',
  'limit',
  'cursor',
] as const satisfies readonly (keyof ImportedGameSearchQuery)[];

export type ImportedGameSearchQueryKey = (typeof importedGameSearchQueryKeys)[number];

const arrayKeys = new Set<ImportedGameSearchQueryKey>([
  'accountIds',
  'providers',
  'resultForUser',
  'userColor',
  'speedCategory',
  'variant',
  'openingEco',
  'analysisStatus',
  'plyIndexStatus',
  'tagCodes',
  'classification',
]);

export function parseImportedGameSearchQuery(source: QueryParameterSource): ImportedGameSearchQuery {
  return canonicalizeImportedGameSearchQuery(parseImportedGameSearchQueryOverrides(source));
}

export function parseImportedGameSearchQueryOverrides(
  source: QueryParameterSource,
): Partial<ImportedGameSearchQuery> {
  const parsed: Partial<Record<ImportedGameSearchQueryKey, unknown>> = {};
  const shape = importedGameSearchQuerySchema.shape;

  for (const key of importedGameSearchQueryKeys) {
    const value = source.get(key);
    if (value === null) continue;

    const result = shape[key].safeParse(value);
    if (!result.success) continue;
    if (Array.isArray(result.data) && result.data.length === 0) continue;
    parsed[key] = result.data;
  }

  return normalizeArrays(parsed) as Partial<ImportedGameSearchQuery>;
}

export function canonicalizeImportedGameSearchQuery(
  query: Partial<ImportedGameSearchQuery>,
): ImportedGameSearchQuery {
  const parsed = importedGameSearchQuerySchema.parse(query);
  return normalizeArrays(parsed) as ImportedGameSearchQuery;
}

export function serializeImportedGameSearchQuery(
  query: ImportedGameSearchCriteria | ImportedGameSearchQuery,
  options: ImportedGameSearchSerializationOptions = {},
): URLSearchParams {
  const canonical = canonicalizeImportedGameSearchQuery(query);
  const params = new URLSearchParams();

  for (const key of importedGameSearchQueryKeys) {
    if (key === 'cursor') continue;
    const value = canonical[key];
    if (value === undefined) continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  if (options.cursor) params.set('cursor', options.cursor);
  return params;
}

function normalizeArrays(
  query: Partial<Record<ImportedGameSearchQueryKey, unknown>>,
): Partial<Record<ImportedGameSearchQueryKey, unknown>> {
  const normalized = { ...query };
  for (const key of arrayKeys) {
    const value = normalized[key];
    if (!Array.isArray(value)) continue;
    const unique = [...new Set(value)];
    unique.sort((left, right) =>
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right)),
    );
    normalized[key] = unique;
  }
  return normalized;
}
