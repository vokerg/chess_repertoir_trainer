import { GameFilters } from './game-filter.model';

export function appendGameFilterParams(params: URLSearchParams, filters: GameFilters): void {
  if (filters.accountId) params.set('accountIds', filters.accountId);
  if (filters.provider && filters.provider !== 'ALL') params.set('providers', filters.provider);
  if (filters.resultForUser) params.set('resultForUser', filters.resultForUser);
  if (filters.userColor) params.set('userColor', filters.userColor);
  if (filters.speedCategory) params.set('speedCategory', filters.speedCategory);
  if (filters.rated) params.set('rated', filters.rated);
  if (filters.timeControl.trim()) params.set('timeControl', filters.timeControl.trim());
  if (filters.opponent.trim()) params.set('opponent', filters.opponent.trim());
  if (filters.openingEco.trim()) params.set('openingEco', filters.openingEco.trim());
  if (filters.openingName.trim()) params.set('openingName', filters.openingName.trim());
  if (filters.analysisStatus) params.set('analysisStatus', filters.analysisStatus);
  if (filters.plyIndexStatus) params.set('plyIndexStatus', filters.plyIndexStatus);
  if (filters.tagFilter) params.set('tagFilter', filters.tagFilter);
  if (filters.tagCodes.length) params.set('tagCodes', filters.tagCodes.join(','));
  if (filters.minAccuracy.trim()) params.set('minAccuracy', filters.minAccuracy.trim());
  if (filters.maxAccuracy.trim()) params.set('maxAccuracy', filters.maxAccuracy.trim());
  if (filters.minOpponentRating.trim())
    params.set('minOpponentRating', filters.minOpponentRating.trim());
  if (filters.maxOpponentRating.trim())
    params.set('maxOpponentRating', filters.maxOpponentRating.trim());
  if (filters.from) params.set('from', dayStartIso(filters.from));
  if (filters.to) params.set('to', dayEndIso(filters.to));
}

export function mapGameFiltersToQueryString(filters: GameFilters, cursor?: string | null): string {
  const params = new URLSearchParams();
  appendGameFilterParams(params, filters);
  params.set('limit', '50');
  params.set('sort', 'endedAtDesc');
  if (cursor) params.set('cursor', cursor);
  return `?${params.toString()}`;
}

function dayStartIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function dayEndIso(value: string): string {
  return `${value}T23:59:59.999Z`;
}
