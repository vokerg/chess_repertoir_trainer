import { defaultGameFilters, GameFilters } from '../game-filters/game-filter.model';
import { OpeningAnalysisGame, OpeningWdl, Provider, ResultForUser } from './position-game-moves.models';

export function defaultOpeningFilters(): GameFilters {
  return { ...defaultGameFilters(), userColor: 'WHITE', rated: 'true' };
}

export function buildOpeningAnalysisQuery(fen: string, filters: GameFilters): string {
  const params = new URLSearchParams({ fen, limit: '200', sort: 'endedAtDesc' });
  setParam(params, 'accountIds', filters.accountId);
  setParam(params, 'providers', filters.provider === 'ALL' ? '' : filters.provider);
  setParam(params, 'resultForUser', filters.resultForUser);
  setParam(params, 'userColor', filters.userColor);
  setParam(params, 'speedCategory', filters.speedCategory);
  setParam(params, 'rated', filters.rated);
  setParam(params, 'timeControl', filters.timeControl.trim());
  setParam(params, 'opponent', filters.opponent.trim());
  setParam(params, 'openingName', filters.openingName.trim());
  setParam(params, 'analysisStatus', filters.analysisStatus);
  setParam(params, 'plyIndexStatus', filters.plyIndexStatus);
  setParam(params, 'minAccuracy', filters.minAccuracy.trim());
  setParam(params, 'maxAccuracy', filters.maxAccuracy.trim());
  setParam(params, 'minOpponentRating', filters.minOpponentRating.trim());
  setParam(params, 'maxOpponentRating', filters.maxOpponentRating.trim());
  setParam(params, 'from', filters.from ? `${filters.from}T00:00:00.000Z` : '');
  setParam(params, 'to', filters.to ? `${filters.to}T23:59:59.999Z` : '');
  return `?${params.toString()}`;
}

export function providerLabel(provider?: Provider | null): string {
  if (provider === 'CHESS_COM') return 'Chess.com';
  if (provider === 'LICHESS') return 'Lichess';
  return 'Provider';
}

export function providerClass(provider?: Provider | null): string {
  return provider === 'CHESS_COM' ? 'provider-chess-com' : 'provider-lichess';
}

export function resultLabel(result?: ResultForUser | null): string {
  if (result === 'WIN') return 'Win';
  if (result === 'DRAW') return 'Draw';
  if (result === 'LOSS') return 'Loss';
  return 'Unknown';
}

export function resultClass(result?: ResultForUser | null): string {
  return result ? `result-${result.toLowerCase()}` : 'result-unknown';
}

export function playerPairLabel(game: OpeningAnalysisGame): string {
  return `${playerLabel(game.white)} vs ${playerLabel(game.black)}`;
}

export function gameDateLabel(game: OpeningAnalysisGame): string {
  if (!game.endedAt) return `#${game.id}`;
  const date = new Date(game.endedAt);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${String(date.getFullYear()).slice(-2)}`;
}

export function gameMetaLabel(game: OpeningAnalysisGame): string {
  const control = game.speedCategory
    ? game.speedCategory.charAt(0).toUpperCase() + game.speedCategory.slice(1)
    : 'Unknown control';
  const opening = game.opening?.eco || game.opening?.name || 'Opening unavailable';
  return `${control} - move ${game.moveNumber}: ${game.nextMoveSan || game.nextMoveUci} - ${opening}`;
}

export function wdlLabel(wdl: OpeningWdl): string {
  return `${wdl.wins} ${wdl.draws} ${wdl.losses}`;
}

export function scoreLabel(wdl: OpeningWdl): string {
  return typeof wdl.scorePct === 'number' ? `${wdl.scorePct}%` : '-';
}

function playerLabel(player?: { username?: string | null; rating?: number | null } | null): string {
  if (!player) return 'Unknown';
  return `${player.username || 'Unknown'}${player.rating ? ` (${player.rating})` : ''}`;
}

function setParam(params: URLSearchParams, key: string, value?: string | null): void {
  if (value) params.set(key, value);
}
