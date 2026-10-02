import { createHash, randomUUID } from 'node:crypto';
import { encodeNormalizedFenCompact } from 'chess-domain';

// Distinct, canonical codec fixtures for tests concerned with relations/cleanup,
// rather than legal game history. Labels never become persisted FEN strings.
export function positionFixtureFen(label = randomUUID()) {
  const seed = createHash('sha256').update(label).digest();
  const squares = Array(64).fill(null);
  squares[0] = 'K';
  squares[63] = 'k';
  for (let i = 0; i < 28; i++) squares[i + 8] = [null, 'P', 'p', 'N', 'n'][seed[i] % 5];
  const ranks = [];
  for (let rank = 7; rank >= 0; rank--) {
    let fen = '', empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = squares[rank * 8 + file];
      if (!piece) empty++;
      else { if (empty) fen += empty; empty = 0; fen += piece; }
    }
    if (empty) fen += empty;
    ranks.push(fen);
  }
  return `${ranks.join('/')} w - -`;
}

export function positionFixtureData(label) {
  return { positionDataCompact: encodeNormalizedFenCompact(positionFixtureFen(label)) };
}
