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
  if (filters.openingName) parts.push(filters.openingName);
  return parts.join(' - ');
}
