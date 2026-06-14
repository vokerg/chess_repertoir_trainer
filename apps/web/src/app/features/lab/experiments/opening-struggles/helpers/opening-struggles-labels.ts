import { OpeningStruggleItem } from '../data-access/opening-struggles.models';
import { Chess } from 'chess.js';

export function lineLabel(item: OpeningStruggleItem): string {
  return formatNumberedSan(item.movesSan?.length ? item.movesSan : movesSan(item.movesUci));
}

export function analysisQueryParams(item: OpeningStruggleItem): Record<string, string | number> {
  const params: Record<string, string | number> = {
    fen: terminalFen(item),
    ply: item.ply,
  };
  if (item.analysisGameId !== null) params['gameId'] = item.analysisGameId;
  return params;
}

export function wdlLabel(item: Pick<OpeningStruggleItem, 'wins' | 'draws' | 'losses'>): string {
  return `${item.wins}-${item.draws}-${item.losses}`;
}

export function userColorLabel(item: Pick<OpeningStruggleItem, 'userColor'>): string {
  return item.userColor === 'WHITE' ? 'White' : 'Black';
}

export function percentLabel(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)}%`;
}

export function evalLabel(value: number | null): string {
  if (value === null) return '-';
  return value > 0 ? `+${value}` : String(value);
}

function movesSan(movesUci: readonly string[]): string[] {
  const chess = new Chess();
  return movesUci.map((uci) => {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || undefined,
      });
      return move?.san || uci;
    } catch {
      return uci;
    }
  });
}

function formatNumberedSan(moves: readonly string[]): string {
  const parts: string[] = [];
  for (let index = 0; index < moves.length; index += 2) {
    const moveNumber = index / 2 + 1;
    const blackMove = moves[index + 1] ? ` ${moves[index + 1]}` : '';
    parts.push(`${moveNumber}. ${moves[index]}${blackMove}`);
  }
  return parts.join(' ');
}

function terminalFen(item: OpeningStruggleItem): string {
  if (item.afterPositionNormalizedFen) return item.afterPositionNormalizedFen;
  const chess = new Chess();
  for (const uci of item.movesUci) {
    try {
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || undefined,
      });
    } catch {
      break;
    }
  }
  return chess.fen();
}
