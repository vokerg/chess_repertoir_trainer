import { decodeNormalizedFen, encodeNormalizedFen, POSITION_DATA_BYTES } from './position-binary';

/**
 * EXPERIMENTAL, canonical variable-length storage; never used for DB writes.
 * Bytes 0..7: little-endian occupancy bitmap. Square a1=0 ... h8=63 is
 * bit (square % 8) of byte floor(square / 8), least significant bit first.
 * Bytes 8..(8+ceil(pieceCount/2)-1): occupied squares in ascending order,
 * using baseline codes 1..12; first piece LOW nibble, second HIGH nibble.
 * For odd counts the final unused HIGH nibble must be zero.
 * Final two bytes: baseline side/castling bits and EP square+1 (or zero).
 * Length = 10 + ceil(pieceCount / 2). At most 32 pieces => at most 26 bytes.
 * Baseline FEN validation applies; this is not a legal reachability check.
 */
export function encodeNormalizedFenCompact(fen: string): Uint8Array {
  const fixed = encodeNormalizedFen(fen);
  const occupied: Array<{ square: number; code: number }> = [];
  for (let square = 0; square < 64; square++) {
    const code = (fixed[square >> 1] >> ((square & 1) * 4)) & 15;
    if (code) occupied.push({ square, code });
  }
  if (occupied.length > 32) throw new Error('Invalid compact position: more than 32 pieces');
  const data = new Uint8Array(10 + Math.ceil(occupied.length / 2));
  for (const [piece, { square, code }] of occupied.entries()) {
    data[square >> 3] |= 1 << (square & 7);
    data[8 + (piece >> 1)] |= code << ((piece & 1) * 4);
  }
  data[data.length - 2] = fixed[32];
  data[data.length - 1] = fixed[33];
  return data;
}

export function decodeNormalizedFenCompact(data: Uint8Array): string {
  if (!(data instanceof Uint8Array) || data.length < 10) {
    throw new Error('Invalid compact position: expected at least 10 bytes');
  }
  const squares: number[] = [];
  for (let square = 0; square < 64; square++) {
    if (data[square >> 3] & (1 << (square & 7))) squares.push(square);
  }
  if (squares.length > 32) throw new Error('Invalid compact position: more than 32 pieces');
  const expectedLength = 10 + Math.ceil(squares.length / 2);
  if (data.length !== expectedLength) {
    throw new Error(`Invalid compact position: ${squares.length} occupied squares require ${expectedLength} bytes, got ${data.length}`);
  }
  if ((squares.length & 1) && (data[data.length - 3] & 0xf0)) {
    throw new Error('Invalid compact position: unused high nibble must be zero');
  }
  const fixed = new Uint8Array(POSITION_DATA_BYTES);
  for (const [piece, square] of squares.entries()) {
    const code = (data[8 + (piece >> 1)] >> ((piece & 1) * 4)) & 15;
    if (code === 0 || code > 12) throw new Error(`Invalid compact position: occupied piece code ${code}`);
    fixed[square >> 1] |= code << ((square & 1) * 4);
  }
  fixed[32] = data[data.length - 2];
  fixed[33] = data[data.length - 1];
  return decodeNormalizedFen(fixed);
}
