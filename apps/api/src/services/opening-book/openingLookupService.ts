import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import { OPENING_BOOK } from './openingBook.generated';
import { OpeningBookEntry, OpeningMatch } from './openingBook.types';

export type { OpeningBookEntry, OpeningLookupSource, OpeningMatch } from './openingBook.types';

type OpeningLookupInput = {
  eco?: string;
  fen?: string;
  moves?: string[] | string;
};

function compareMostSpecific(a: OpeningBookEntry, b: OpeningBookEntry): number {
  return b.ply - a.ply || a.name.localeCompare(b.name) || a.epd.localeCompare(b.epd) || a.uci.localeCompare(b.uci);
}

function toMatch(entry: OpeningBookEntry, source: OpeningMatch['source']): OpeningMatch {
  return { ...entry, source };
}

function normalizeFenLikePosition(fen: string): string | null {
  const trimmed = fen.trim();
  if (!trimmed) return null;

  try {
    if (trimmed === 'startpos') return normalizeFenForPosition(trimmed);
    const parts = trimmed.split(/\s+/);
    const fenForChess = parts.length === 4 ? `${trimmed} 0 1` : trimmed;
    return normalizeFenForPosition(fenForChess);
  } catch {
    return null;
  }
}

function normalizeMoveInput(moves: string[] | string): string[] {
  if (Array.isArray(moves)) return moves.map((move) => move.trim()).filter(Boolean);
  return moves
    .split(/[\s,]+/)
    .map((move) => move.trim())
    .filter(Boolean);
}

function isUciMove(move: string): boolean {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move);
}

function playMove(chess: Chess, move: string): boolean {
  try {
    if (isUciMove(move)) {
      const played = chess.move({
        from: move.slice(0, 2).toLowerCase(),
        to: move.slice(2, 4).toLowerCase(),
        promotion: move.slice(4, 5).toLowerCase() || undefined,
      });
      return Boolean(played);
    }

    return Boolean(chess.move(move));
  } catch {
    return false;
  }
}

function buildEcoMap(): Map<string, OpeningBookEntry[]> {
  const map = new Map<string, OpeningBookEntry[]>();
  for (const entry of OPENING_BOOK) {
    const eco = entry.eco.trim().toUpperCase();
    const entries = map.get(eco) ?? [];
    entries.push(entry);
    map.set(eco, entries);
  }
  for (const entries of map.values()) {
    entries.sort(compareMostSpecific);
  }
  return map;
}

function buildEpdMap(): Map<string, OpeningBookEntry[]> {
  const map = new Map<string, OpeningBookEntry[]>();
  for (const entry of OPENING_BOOK) {
    const normalized = normalizeFenLikePosition(entry.epd);
    if (!normalized) continue;
    const entries = map.get(normalized) ?? [];
    entries.push(entry);
    map.set(normalized, entries);
  }
  for (const entries of map.values()) {
    entries.sort(compareMostSpecific);
  }
  return map;
}

const openingsByEco = buildEcoMap();
const openingsByEpd = buildEpdMap();

export const OpeningLookupService = {
  lookupByEco(eco: string): OpeningMatch | null {
    const entries = openingsByEco.get(eco.trim().toUpperCase());
    return entries?.[0] ? toMatch(entries[0], 'ECO') : null;
  },

  lookupByFen(fen: string): OpeningMatch | null {
    const normalizedFen = normalizeFenLikePosition(fen);
    if (!normalizedFen) return null;
    const entries = openingsByEpd.get(normalizedFen);
    return entries?.[0] ? toMatch(entries[0], 'FEN') : null;
  },

  lookupByMoves(moves: string[] | string): OpeningMatch | null {
    const moveList = normalizeMoveInput(moves);
    if (moveList.length === 0) return null;

    const chess = new Chess();
    let match: OpeningMatch | null = null;

    for (const move of moveList) {
      if (!playMove(chess, move)) return null;
      const normalizedFen = normalizeFenLikePosition(chess.fen());
      if (!normalizedFen) return null;
      const entries = openingsByEpd.get(normalizedFen);
      if (entries?.[0]) match = toMatch(entries[0], 'MOVES');
    }

    return match;
  },

  lookup(input: OpeningLookupInput): OpeningMatch | null {
    if (input.fen) {
      const match = this.lookupByFen(input.fen);
      if (match) return match;
    }
    if (input.moves) {
      const match = this.lookupByMoves(input.moves);
      if (match) return match;
    }
    if (input.eco) return this.lookupByEco(input.eco);
    return null;
  },
};

