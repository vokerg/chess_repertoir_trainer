import { describe, expect, it } from 'vitest';
import { decodeUciMove, encodeUciMove } from '../src/uci-move-code';

describe('coordinate UCI move codec', () => {
  it.each([
    ['a1b1', 64], ['h8a1', 63], ['e2e4', 1804],
    ['e1g1', 388], ['e1c1', 132], ['e8g8', 4028], ['e8c8', 3772],
    ['e5d6', 2788], ['e4d3', 1244],
    ['a7a8n', 7728], ['a7a8b', 11824], ['a7a8r', 15920], ['e7e8q', 20276],
  ])('encodes %s as %i', (uci, code) => {
    expect(encodeUciMove(uci)).toBe(code);
    expect(decodeUciMove(code)).toBe(uci);
  });

  it('exhaustively round-trips every supported from/to/promotion combination', () => {
    const squares = [...'12345678'].flatMap((rank) => [...'abcdefgh'].map((file) => file + rank));
    const codes = new Set<number>();
    for (const [fromIndex, from] of squares.entries()) {
      for (const [toIndex, to] of squares.entries()) {
        if (from === to) continue;
        for (const [promotionCode, promotion] of ['', 'n', 'b', 'r', 'q'].entries()) {
          const uci = from + to + promotion;
          const code = encodeUciMove(uci);
          expect(code).toBe(fromIndex + toIndex * 64 + promotionCode * 4096);
          expect(code).toBeGreaterThanOrEqual(0);
          expect(code).toBeLessThanOrEqual(32767);
          expect(decodeUciMove(code)).toBe(uci);
          codes.add(code);
        }
      }
    }
    expect(codes.size).toBe(64 * 63 * 5);
  });

  it.each(['', '0000', 'e2e2', 'a7a7q', 'E2e4', 'e2E4', 'i2e4', 'e0e4', 'e9e4',
    'e2e4Q', 'e2e4p', 'e2e4k', 'e2-e4', ' e2e4', 'e2e4 ', 'e2e4\n', 'e2e4qq', 'e2e', 'e4'])
  ('rejects malformed or unsupported UCI %j', (uci) => {
    expect(() => encodeUciMove(uci)).toThrow('Invalid UCI move');
  });

  it('rejects runtime non-string input', () => {
    for (const value of [null, undefined, 1804, {}, ['e2e4']]) {
      expect(() => encodeUciMove(value as unknown as string)).toThrow();
    }
  });

  it('exhaustively rejects reserved promotion codes and identical squares', () => {
    for (let code = 0; code <= 32767; code++) {
      const valid = Math.floor(code / 4096) <= 4 && code % 64 !== Math.floor(code / 64) % 64;
      if (valid) expect(encodeUciMove(decodeUciMove(code))).toBe(code);
      else expect(() => decodeUciMove(code)).toThrow('Invalid UCI move code');
    }
  });

  it.each([-32768, -1, 32768, 65536, 2 ** 32 + 1804, 1.5, NaN, Infinity, -Infinity,
    null, undefined, '1804', {}])('rejects invalid code %j', (code) => {
    expect(() => decodeUciMove(code as number)).toThrow('Invalid UCI move code');
  });
});
