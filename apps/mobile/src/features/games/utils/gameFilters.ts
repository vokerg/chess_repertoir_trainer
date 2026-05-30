export type GameFilters = Record<string, unknown>;

const FILTER_KEYS = [
  'limit',
  'sort',
  'cursor',
  'accountIds',
  'providers',
  'resultForUser',
  'userColor',
  'speedCategory',
  'rated',
  'opponent',
  'openingName',
  'analysisStatus',
  'plyIndexStatus',
  'minAccuracy',
  'maxAccuracy',
  'minOpponentRating',
  'from',
  'to',
];

export function mapGameFiltersToQueryString(filters: GameFilters): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    appendParam(params, key, filters[key]);
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

function appendParam(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null || value === '') return;
  if (Array.isArray(value)) {
    if (value.length > 0) params.set(key, value.join(','));
    return;
  }
  params.set(key, String(value));
}
