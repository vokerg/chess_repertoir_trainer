import { Chess, validateFen } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { decodeNormalizedFenCompact, encodeNormalizedFenCompact, normalizeFenForPosition } from '../src';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const SPARSE = '7k/8/8/8/8/8/8/K7 w - -';
const ODD = '7k/8/8/8/8/1N6/8/K7 w - -';

function boardFen(board: string[]): string {
  const ranks: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let text = '', empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = board[rank * 8 + file];
      if (!piece) empty++;
      else { if (empty) text += empty; empty = 0; text += piece; }
    }
    if (empty) text += empty;
    ranks.push(text);
  }
  return `${ranks.join('/')} w - -`;
}

describe('experimental compact normalized FEN codec', () => {
  it('encodes the start position as exactly 26 known bytes', () => {
    const data = encodeNormalizedFenCompact(START);
    expect(data.length).toBe(26);
    expect([...data]).toEqual([
      0xff, 0xff, 0, 0, 0, 0, 0xff, 0xff,
      0x24, 0x53, 0x36, 0x42, 0x11, 0x11, 0x11, 0x11,
      0x77, 0x77, 0x77, 0x77, 0x8a, 0xb9, 0x9c, 0xa8, 30, 0,
    ]);
    expect(decodeNormalizedFenCompact(data)).toBe(START);
    expect(encodeNormalizedFenCompact(decodeNormalizedFenCompact(data))).toEqual(data);
  });

  it('stores only the kings in 11 bytes and fixes bitmap endianness at both ends', () => {
    const data = encodeNormalizedFenCompact(SPARSE);
    expect(data.length).toBe(11);
    expect([...data]).toEqual([1, 0, 0, 0, 0, 0, 0, 0x80, 0xc6, 0, 0]);
    expect(decodeNormalizedFenCompact(data)).toBe(SPARSE);
    const buffer = new Uint8Array(20);
    buffer.set(data, 4);
    expect(decodeNormalizedFenCompact(buffer.subarray(4, 15))).toBe(SPARSE);
  });

  it('encodes 24 pieces as 22 bytes', () => {
    const fen = START.replace('PPPPPPPP', '8');
    const data = encodeNormalizedFenCompact(fen);
    expect(data.length).toBe(22);
    expect(decodeNormalizedFenCompact(data)).toBe(fen);
  });

  it('has canonical zero padding for odd piece counts', () => {
    const data = encodeNormalizedFenCompact(ODD);
    expect([...data]).toEqual([1, 0, 2, 0, 0, 0, 0, 0x80, 0x26, 0x0c, 0, 0]);
    expect(decodeNormalizedFenCompact(data)).toBe(ODD);
    for (let padding = 1; padding <= 15; padding++) {
      const invalid = data.slice();
      invalid[9] |= padding << 4;
      expect(() => decodeNormalizedFenCompact(invalid)).toThrow('unused high nibble');
    }
  });

  it('exhausts supported piece counts and rejects more than 32 pieces', () => {
    const board = Array<string>(64).fill('');
    board[0] = 'K'; board[63] = 'k';
    for (let count = 2; count <= 32; count++) {
      const fen = boardFen(board);
      const data = encodeNormalizedFenCompact(fen);
      expect(data.length).toBe(10 + Math.ceil(count / 2));
      expect(data.length).toBeLessThanOrEqual(26);
      expect(decodeNormalizedFenCompact(data)).toBe(fen);
      expect(encodeNormalizedFenCompact(decodeNormalizedFenCompact(data))).toEqual(data);
      board[count - 1] = 'N';
    }
    expect(() => encodeNormalizedFenCompact(boardFen(board))).toThrow('more than 32 pieces');
    const overfull = new Uint8Array(27);
    overfull.set([255, 255, 255, 255, 1]);
    expect(() => decodeNormalizedFenCompact(overfull)).toThrow('more than 32 pieces');
  });

  it('checks each piece code and occupancy bit on every supported square', () => {
    for (const [offset, piece] of [...'PNBRQKpnbrqk'].entries()) {
      for (let square = 0; square < 64; square++) {
        if (piece.toLowerCase() === 'p' && (square < 8 || square >= 56)) continue;
        const board = Array<string>(64).fill('');
        board[square] = piece;
        if (piece !== 'K') board[[0, 1, 2].find((s) => s !== square)!] = 'K';
        if (piece !== 'k') board[[63, 62, 61].find((s) => s !== square)!] = 'k';
        const fen = boardFen(board);
        const data = encodeNormalizedFenCompact(fen);
        const pieceIndex = board.slice(0, square).filter(Boolean).length;
        expect((data[8 + (pieceIndex >> 1)] >> ((pieceIndex & 1) * 4)) & 15).toBe(offset + 1);
        for (let index = 0; index < 64; index++) {
          expect(Boolean(data[index >> 3] & (1 << (index & 7)))).toBe(Boolean(board[index]));
        }
        expect(decodeNormalizedFenCompact(data)).toBe(fen);
        expect(encodeNormalizedFenCompact(decodeNormalizedFenCompact(data))).toEqual(data);
      }
    }
  });

  it('exhausts both sides, all 16 castling combinations and all FEN EP targets', () => {
    for (const side of ['w', 'b']) {
      const targets = ['-', ...[...'abcdefgh'].map((file) => file + (side === 'w' ? '6' : '3'))];
      for (let rights = 0; rights < 16; rights++) {
        const castling = [...'KQkq'].filter((_, bit) => rights & (1 << bit)).join('') || '-';
        for (const ep of targets) {
          const fen = `${START.split(' ')[0]} ${side} ${castling} ${ep}`;
          const data = encodeNormalizedFenCompact(fen);
          expect(data[24]).toBe((rights << 1) | (side === 'b' ? 1 : 0));
          expect(data[25]).toBe(ep === '-' ? 0 : 1 + ep.charCodeAt(0) - 97 + (Number(ep[1]) - 1) * 8);
          expect(decodeNormalizedFenCompact(data)).toBe(fen);
          expect(validateFen(`${decodeNormalizedFenCompact(data)} 0 1`).ok).toBe(true);
          expect(encodeNormalizedFenCompact(decodeNormalizedFenCompact(data))).toEqual(data);
        }
      }
    }
  });

  it('deterministically round-trips played games byte for byte', () => {
    let seed = 0x12345678, positions = 0;
    for (let game = 0; game < 12; game++) {
      const chess = new Chess();
      for (let ply = 0; ply < 160 && !chess.isGameOver(); ply++) {
        const fen = normalizeFenForPosition(chess.fen());
        const data = encodeNormalizedFenCompact(fen);
        expect(decodeNormalizedFenCompact(data)).toBe(fen);
        expect(encodeNormalizedFenCompact(fen)).toEqual(data);
        expect(encodeNormalizedFenCompact(decodeNormalizedFenCompact(data))).toEqual(data);
        expect(data.length).toBeLessThanOrEqual(26);
        positions++;
        const moves = chess.moves();
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        chess.move(moves[seed % moves.length]);
      }
    }
    expect(positions).toBeGreaterThan(1000);
  });

  it.each([
    '', 'startpos', `${START} 0 1`, START.replace(' w ', ' x '),
    START.replace('KQkq', 'QK'), START.replace('KQkq', 'KK'), START.replace('KQkq', 'K-'), START.replace('KQkq', ''),
    START.replace(' -', ' a1'), START.replace(' -', ' i6'), START.replace(' -', ' a3'),
    START.replace(' w ', ' b ').replace(' -', ' h6'),
    START.replace('/8/', '/44/'), START.replace('/8/', '/7/'), START.replace('/8/', '/9/'), START.replace('/8/', '/08/'),
    START.replace('rnbqkbnr/', ''), START.replace('rnbqkbnr/', 'rnbxkbnr/'), START.replace('K', 'Q'),
    START.replace('RNBQKBNR', 'RNBKKBNR'), START.replace('RNBQKBNR', 'PNBQKBNR'),
    ` ${START}`, `${START} `, `${START}\n`, START.replace(' w ', '  w '), START.replace(' w ', '\tw '),
  ])('rejects malformed or noncanonical FEN %j', (fen) => {
    expect(() => encodeNormalizedFenCompact(fen)).toThrow('Invalid normalized FEN');
  });

  it('rejects runtime values of the wrong type', () => {
    for (const fen of [null, undefined, 34, {}, []]) {
      expect(() => encodeNormalizedFenCompact(fen as unknown as string)).toThrow();
    }
    for (const data of [null, undefined, [], new Array(11).fill(0), new Uint16Array(11)]) {
      expect(() => decodeNormalizedFenCompact(data as Uint8Array)).toThrow();
    }
  });

  it('rejects short headers and both truncated and extra piece data', () => {
    for (let length = 0; length < 10; length++) {
      expect(() => decodeNormalizedFenCompact(new Uint8Array(length))).toThrow('at least 10 bytes');
    }
    for (const fen of [SPARSE, ODD, START]) {
      const data = encodeNormalizedFenCompact(fen);
      for (let length = 10; length < data.length; length++) {
        expect(() => decodeNormalizedFenCompact(data.slice(0, length))).toThrow('occupied squares require');
      }
      for (const extra of [1, 2, 16]) {
        const longer = new Uint8Array(data.length + extra);
        longer.set(data);
        expect(() => decodeNormalizedFenCompact(longer)).toThrow('occupied squares require');
      }
    }
  });

  it('rejects changed occupancy with insufficient, extra or inconsistent piece data', () => {
    const data = encodeNormalizedFenCompact(SPARSE);
    data[0] |= 2; // Three squares need two piece bytes, rather than one.
    expect(() => decodeNormalizedFenCompact(data)).toThrow('3 occupied squares require 12 bytes');
    const fewer = encodeNormalizedFenCompact(ODD);
    fewer[2] = 0;
    expect(() => decodeNormalizedFenCompact(fewer)).toThrow('2 occupied squares require 11 bytes');
    const sameLength = encodeNormalizedFenCompact(ODD);
    sameLength[2] |= 4; // Fourth square fits the same byte count, but its code is zero.
    expect(() => decodeNormalizedFenCompact(sameLength)).toThrow('occupied piece code 0');
  });

  it('rejects codes 0 and 13..15 in every occupied-piece nibble', () => {
    for (let piece = 0; piece < 32; piece++) {
      for (const code of [0, 13, 14, 15]) {
        const data = encodeNormalizedFenCompact(START);
        const shift = (piece & 1) * 4;
        data[8 + (piece >> 1)] = (data[8 + (piece >> 1)] & ~(15 << shift)) | (code << shift);
        expect(() => decodeNormalizedFenCompact(data)).toThrow(`occupied piece code ${code}`);
      }
    }
  });

  it('exhaustively rejects reserved metadata bits at variable offsets', () => {
    for (const fen of [SPARSE, ODD, START]) {
      for (let metadata = 32; metadata < 256; metadata++) {
        const data = encodeNormalizedFenCompact(fen);
        data[data.length - 2] = metadata;
        expect(() => decodeNormalizedFenCompact(data)).toThrow('reserved metadata');
      }
    }
  });

  it('exhausts every en-passant byte for both sides', () => {
    for (const side of ['w', 'b']) {
      for (let ep = 0; ep < 256; ep++) {
        const data = encodeNormalizedFenCompact(START.replace(' w ', ` ${side} `));
        data[data.length - 1] = ep;
        const valid = ep === 0 || (side === 'w' ? ep >= 41 && ep <= 48 : ep >= 17 && ep <= 24);
        if (valid) expect(encodeNormalizedFenCompact(decodeNormalizedFenCompact(data))).toEqual(data);
        else expect(() => decodeNormalizedFenCompact(data)).toThrow();
      }
    }
  });

  it('rejects boards that cannot decode to valid normalized FEN', () => {
    expect(() => decodeNormalizedFenCompact(new Uint8Array(10))).toThrow('missing white king');
    const duplicate = encodeNormalizedFenCompact(ODD);
    duplicate[8] = 0x66;
    expect(() => decodeNormalizedFenCompact(duplicate)).toThrow('too many white kings');
    const edgePawn = encodeNormalizedFenCompact(START);
    edgePawn[8] = (edgePawn[8] & 0xf0) | 1;
    expect(() => decodeNormalizedFenCompact(edgePawn)).toThrow('pawns are on the edge');
  });
});
