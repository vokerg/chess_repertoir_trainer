import { validateFen } from 'chess.js';

export const POSITION_DATA_BYTES = 34;

/**
 * Reversible storage for canonical four-field FEN, without normalizing away EP.
 * Squares: a1=0, b1=1, ..., h8=63. Bytes 0..31 hold the even square in
 * the LOW nibble and the following odd square in the HIGH nibble.
 * Codes: empty=0; white P/N/B/R/Q/K=1..6; black p/n/b/r/q/k=7..12.
 * Byte 32: bit 0 black to move, bits 1..4 K/Q/k/q, bits 5..7 reserved zero.
 * Byte 33: no EP=0, otherwise square index + 1 (1..64).
 * Validation is FEN validation, not proof that a position is legally reachable.
 */
export function encodeNormalizedFen(normalizedFen: string): Uint8Array {
  assertNormalizedFen(normalizedFen);
  const [placement, side, castling, ep] = normalizedFen.split(' ');
  const data = new Uint8Array(POSITION_DATA_BYTES);
  for (const [fenRank, rank] of placement.split('/').entries()) {
    let file = 0;
    for (const token of rank) {
      if (token >= '1' && token <= '8') {
        file += Number(token);
      } else {
        const square = (7 - fenRank) * 8 + file;
        data[square >> 1] |= pieceCode(token) << ((square & 1) * 4);
        file += 1;
      }
    }
  }
  data[32] = (side === 'b' ? 1 : 0)
    | (castling.includes('K') ? 2 : 0)
    | (castling.includes('Q') ? 4 : 0)
    | (castling.includes('k') ? 8 : 0)
    | (castling.includes('q') ? 16 : 0);
  data[33] = ep === '-' ? 0 : 1 + ep.charCodeAt(0) - 97 + (Number(ep[1]) - 1) * 8;
  return data;
}

export function decodeNormalizedFen(positionData: Uint8Array): string {
  if (!(positionData instanceof Uint8Array) || positionData.length !== POSITION_DATA_BYTES) {
    throw new Error(`Invalid position data: expected ${POSITION_DATA_BYTES} bytes`);
  }
  const metadata = positionData[32];
  if (metadata & 0xe0) throw new Error('Invalid position data: reserved metadata bits must be zero');
  const epByte = positionData[33];
  if (epByte > 64) throw new Error(`Invalid position data: en-passant byte ${epByte}`);

  const ranks: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let fenRank = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const square = rank * 8 + file;
      const code = (positionData[square >> 1] >> ((square & 1) * 4)) & 15;
      if (code === 0) {
        empty += 1;
      } else {
        if (empty) fenRank += empty;
        empty = 0;
        fenRank += pieceSymbol(code);
      }
    }
    if (empty) fenRank += empty;
    ranks.push(fenRank);
  }
  const castling = (metadata & 2 ? 'K' : '') + (metadata & 4 ? 'Q' : '')
    + (metadata & 8 ? 'k' : '') + (metadata & 16 ? 'q' : '');
  const epSquare = epByte - 1;
  const ep = epByte === 0 ? '-' : String.fromCharCode(97 + (epSquare & 7), 49 + (epSquare >> 3));
  const fen = `${ranks.join('/')} ${metadata & 1 ? 'b' : 'w'} ${castling || '-'} ${ep}`;
  assertNormalizedFen(fen);
  return fen;
}

function assertNormalizedFen(fen: string): void {
  // Canonical whitespace, compressed ranks and ordered unique rights are needed
  // for exact string reversibility. Reject alternate spellings instead of fixing them.
  if (typeof fen !== 'string'
    || !/^[prnbqkPRNBQK1-8/]+ [wb] (?:-|(?=[KQkq])K?Q?k?q?) (?:-|[a-h][36])$(?![\s\S])/.test(fen)) {
    throw new Error(`Invalid normalized FEN: ${String(fen)}`);
  }
  const result = validateFen(`${fen} 0 1`);
  if (!result.ok) throw new Error(`Invalid normalized FEN: ${result.error}`);
}

function pieceCode(piece: string): number {
  switch (piece) {
    case 'P': return 1;
    case 'N': return 2;
    case 'B': return 3;
    case 'R': return 4;
    case 'Q': return 5;
    case 'K': return 6;
    case 'p': return 7;
    case 'n': return 8;
    case 'b': return 9;
    case 'r': return 10;
    case 'q': return 11;
    case 'k': return 12;
    default: throw new Error(`Invalid FEN piece: ${piece}`);
  }
}

function pieceSymbol(code: number): string {
  switch (code) {
    case 1: return 'P';
    case 2: return 'N';
    case 3: return 'B';
    case 4: return 'R';
    case 5: return 'Q';
    case 6: return 'K';
    case 7: return 'p';
    case 8: return 'n';
    case 9: return 'b';
    case 10: return 'r';
    case 11: return 'q';
    case 12: return 'k';
    default: throw new Error(`Invalid position data: piece code ${code}`);
  }
}
