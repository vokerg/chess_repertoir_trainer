import { GameFilters } from './game-filter.model';

export function summaryGameFilters(filters: GameFilters): string {
  const parts = [
    filters.userColor ? (filters.userColor === 'WHITE' ? 'White' : 'Black') : 'Either colour',
    filters.speedCategory ? filters.speedCategory.replace(',', ' + ') : 'Any speed',
    filters.rated === 'true' ? 'Rated' : filters.rated === 'false' ? 'Casual' : 'Rated or casual',
  ];
  if (filters.minOpponentRating) parts.push(`Opponent ${filters.minOpponentRating}+`);
  if (filters.accountId) parts.push('Selected account');
  else if (filters.provider && filters.provider !== 'ALL') {
    parts.push(filters.provider === 'CHESS_COM' ? 'Chess.com' : 'Lichess');
  }
  if (filters.tagFilter === 'NO_TAGS') parts.push('No tags');
  else if (filters.tagCodes.length) parts.push(`${filters.tagCodes.length} tag${filters.tagCodes.length === 1 ? '' : 's'}`);
  if (filters.openingEco && filters.openingName) parts.push(`${filters.openingEco} · ${filters.openingName}`);
  else if (filters.openingEco) parts.push(filters.openingEco);
  else if (filters.openingName) parts.push(filters.openingName);
  return parts.join(' - ');
}
