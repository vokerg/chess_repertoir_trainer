import { UserColor } from '@/api/dto';

export type OpeningAnalysisFilters = Record<string, unknown> & {
  fen: string;
  userColor: UserColor;
};

export function openingAnalysisQueryString(filters: OpeningAnalysisFilters): string {
  const params = new URLSearchParams();
  params.set('fen', filters.fen);
  params.set('rated', 'true');
  params.set('limit', String(filters.limit ?? 200));
  params.set('sort', String(filters.sort ?? 'endedAtDesc'));
  params.set('userColor', filters.userColor);

  for (const key of [
    'accountIds',
    'providers',
    'resultForUser',
    'speedCategory',
    'timeControl',
    'opponent',
    'openingName',
    'analysisStatus',
    'minAccuracy',
    'maxAccuracy',
    'minOpponentRating',
    'from',
    'to',
  ]) {
    const value = filters[key];
    if (value === undefined || value === null || value === '') continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  return `?${params.toString()}`;
}
