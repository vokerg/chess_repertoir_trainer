/**
 * Stateless coordinate-UCI storage codec (not board-dependent move legality).
 * Bits 0..5: from; 6..11: to; 12..14: none/n/b/r/q promotion.
 * Null moves and identical source/destination squares are unsupported.
 */
export function encodeUciMove(uci: string): number {
  if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][nbrq]?(?![\s\S])/.test(uci)) {
    throw new Error(`Invalid UCI move: ${String(uci)}`);
  }
  const from = squareIndex(uci, 0);
  const to = squareIndex(uci, 2);
  if (from === to) throw new Error(`Invalid UCI move: ${uci}`);
  let promotion = 0;
  switch (uci[4]) {
    case 'n': promotion = 1; break;
    case 'b': promotion = 2; break;
    case 'r': promotion = 3; break;
    case 'q': promotion = 4; break;
  }
  return from | (to << 6) | (promotion << 12);
}

export function decodeUciMove(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x4fff) {
    throw new Error(`Invalid UCI move code: ${String(code)}`);
  }
  const from = code & 63;
  const to = (code >> 6) & 63;
  if (from === to) throw new Error(`Invalid UCI move code: ${code}`);
  let promotion = '';
  switch (code >> 12) {
    case 1: promotion = 'n'; break;
    case 2: promotion = 'b'; break;
    case 3: promotion = 'r'; break;
    case 4: promotion = 'q'; break;
  }
  return squareUci(from) + squareUci(to) + promotion;
}

function squareIndex(uci: string, offset: number): number {
  return uci.charCodeAt(offset) - 97 + (uci.charCodeAt(offset + 1) - 49) * 8;
}

function squareUci(index: number): string {
  return String.fromCharCode(97 + (index & 7), 49 + (index >> 3));
}
