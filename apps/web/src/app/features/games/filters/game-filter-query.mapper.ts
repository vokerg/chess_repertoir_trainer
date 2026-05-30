import { GameFilters } from './game-filter.model';

export function mapGameFiltersToQueryString(filters: GameFilters, cursor?: string | null): string {
  const params = new URLSearchParams();
  params.set('limit', '50');
  params.set('sort', 'endedAtDesc');
  if (cursor) params.set('cursor', cursor);
  if (filters.accountId) params.set('accountIds', filters.accountId);
  if (filters.provider && filters.provider !== 'ALL') params.set('providers', filters.provider);
  if (filters.resultForUser) params.set('resultForUser', filters.resultForUser);
  if (filters.userColor) params.set('userColor', filters.userColor);
  if (filters.speedCategory) params.set('speedCategory', filters.speedCategory);
  if (filters.rated) params.set('rated', filters.rated);
  if (filters.opponent.trim()) params.set('opponent', filters.opponent.trim());
  if (filters.openingName.trim()) params.set('openingName', filters.openingName.trim());
  if (filters.analysisStatus) params.set('analysisStatus', filters.analysisStatus);
  if (filters.plyIndexStatus) params.set('plyIndexStatus', filters.plyIndexStatus);
  if (filters.minAccuracy.trim()) params.set('minAccuracy', filters.minAccuracy.trim());
  if (filters.maxAccuracy.trim()) params.set('maxAccuracy', filters.maxAccuracy.trim());
  if (filters.minOpponentRating.trim()) params.set('minOpponentRating', filters.minOpponentRating.trim());
  if (filters.from) params.set('from', dayStartIso(filters.from));
  if (filters.to) params.set('to', dayEndIso(filters.to));
  return `?${params.toString()}`;
}

function dayStartIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function dayEndIso(value: string): string {
  return `${value}T23:59:59.999Z`;
}
