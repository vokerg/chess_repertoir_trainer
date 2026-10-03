import { Chess, validateFen } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { decodeNormalizedFen, encodeNormalizedFen, normalizeFenForPosition, POSITION_DATA_BYTES } from '../src';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const SPARSE = '7k/8/8/8/8/8/8/K7 w - -';

describe('normalized FEN binary codec', () => {
  it('uses the exact starting-position bytes, square order, codes and nibble order', () => {
    const bytes = encodeNormalizedFen(START);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(POSITION_DATA_BYTES);
    expect([...bytes]).toEqual([
      0x24, 0x53, 0x36, 0x42, 0x11, 0x11, 0x11, 0x11,
      ...Array<number>(16).fill(0),
      0x77, 0x77, 0x77, 0x77, 0x8a, 0xb9, 0x9c, 0xa8, 30, 0,
    ]);
    expect(decodeNormalizedFen(bytes)).toBe(START);
  });

  it('packs a1 and h8 correctly on a sparse board and supports byte-array views', () => {
    const bytes = encodeNormalizedFen(SPARSE);
    expect(bytes[0]).toBe(6);
    expect(bytes[31]).toBe(0xc0);
    expect([...bytes.slice(1, 31)]).toEqual(Array<number>(30).fill(0));
    const buffer = new Uint8Array(40);
    buffer.set(bytes, 3);
    expect(decodeNormalizedFen(buffer.subarray(3, 37))).toBe(SPARSE);
  });

  it('exhausts both sides, all 16 castling combinations, and every FEN EP target', () => {
    for (const side of ['w', 'b']) {
      const targets = ['-', ...[...'abcdefgh'].map((file) => file + (side === 'w' ? '6' : '3'))];
      for (let rights = 0; rights < 16; rights++) {
        const castling = [...'KQkq'].filter((_, bit) => rights & (1 << bit)).join('') || '-';
        for (const ep of targets) {
          const fen = `${START.split(' ')[0]} ${side} ${castling} ${ep}`;
          const bytes = encodeNormalizedFen(fen);
          expect(bytes[32]).toBe((rights << 1) | (side === 'b' ? 1 : 0));
          expect(bytes[33]).toBe(ep === '-' ? 0 : 1 + ep.charCodeAt(0) - 97 + (Number(ep[1]) - 1) * 8);
          expect(decodeNormalizedFen(bytes)).toBe(fen);
          expect(validateFen(`${decodeNormalizedFen(bytes)} 0 1`).ok).toBe(true);
        }
      }
    }
  });

  it('checks each piece code on each square, including both nibbles', () => {
    for (const [offset, piece] of [...'PNBRQKpnbrqk'].entries()) {
      for (let square = 0; square < 64; square++) {
        if (piece.toLowerCase() === 'p' && (square < 8 || square >= 56)) continue;
        const board = Array<string>(64).fill('');
        board[square] = piece;
        if (piece !== 'K') board[[0, 1, 2].find((s) => s !== square)!] = 'K';
        if (piece !== 'k') board[[63, 62, 61].find((s) => s !== square)!] = 'k';
        const ranks: string[] = [];
        for (let rank = 7; rank >= 0; rank--) {
          let text = '', empty = 0;
          for (let file = 0; file < 8; file++) {
            const symbol = board[rank * 8 + file];
            if (!symbol) empty++;
            else { if (empty) text += empty; empty = 0; text += symbol; }
          }
          if (empty) text += empty;
          ranks.push(text);
        }
        const fen = `${ranks.join('/')} w - -`;
        const bytes = encodeNormalizedFen(fen);
        expect((bytes[square >> 1] >> ((square & 1) * 4)) & 15).toBe(offset + 1);
        expect(decodeNormalizedFen(bytes)).toBe(fen);
      }
    }
  });

  it('deterministically round-trips normalized positions from played games', () => {
    let seed = 0x12345678;
    let positions = 0;
    for (let game = 0; game < 12; game++) {
      const chess = new Chess();
      for (let ply = 0; ply < 160 && !chess.isGameOver(); ply++) {
        const fen = normalizeFenForPosition(chess.fen());
        const bytes = encodeNormalizedFen(fen);
        expect(bytes.length).toBe(34);
        expect(decodeNormalizedFen(bytes)).toBe(fen);
        expect(encodeNormalizedFen(fen)).toEqual(bytes);
        expect(encodeNormalizedFen(decodeNormalizedFen(bytes))).toEqual(bytes);
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
    START.replace('KQkq', 'QK'), START.replace('KQkq', 'KK'),
    START.replace('KQkq', 'K-'), START.replace('KQkq', ''),
    START.replace(' -', ' a1'), START.replace(' -', ' i6'), START.replace(' -', ' a3'),
    START.replace(' w ', ' b ').replace(' -', ' h6'),
    START.replace('/8/', '/44/'), START.replace('/8/', '/7/'), START.replace('/8/', '/9/'),
    START.replace('/8/', '/08/'), START.replace('rnbqkbnr/', ''), START.replace('rnbqkbnr/', 'rnbxkbnr/'),
    START.replace('K', 'Q'), START.replace('RNBQKBNR', 'RNBKKBNR'),
    START.replace('RNBQKBNR', 'PNBQKBNR'),
    ` ${START}`, `${START} `, `${START}\n`, START.replace(' w ', '  w '), START.replace(' w ', '\tw '),
  ])('rejects malformed or noncanonical FEN %j', (fen) => {
    expect(() => encodeNormalizedFen(fen)).toThrow('Invalid normalized FEN');
  });

  it('rejects non-string FEN at runtime', () => {
    for (const fen of [null, undefined, 34, {}, []]) {
      expect(() => encodeNormalizedFen(fen as unknown as string)).toThrow();
    }
  });

  it.each([0, 1, 32, 33, 35, 64])('rejects binary length %i', (length) => {
    expect(() => decodeNormalizedFen(new Uint8Array(length))).toThrow('expected 34 bytes');
  });

  it('rejects non-byte arrays at runtime', () => {
    for (const data of [null, undefined, [], new Array(34).fill(0), new Uint16Array(34)]) {
      expect(() => decodeNormalizedFen(data as Uint8Array)).toThrow();
    }
  });

  it('rejects codes 13..15 at every square', () => {
    for (let square = 0; square < 64; square++) {
      for (const code of [13, 14, 15]) {
        const bytes = encodeNormalizedFen(START);
        const shift = (square & 1) * 4;
        bytes[square >> 1] = (bytes[square >> 1] & ~(15 << shift)) | (code << shift);
        expect(() => decodeNormalizedFen(bytes)).toThrow(`piece code ${code}`);
      }
    }
  });

  it('exhaustively rejects reserved metadata bits', () => {
    for (let metadata = 32; metadata < 256; metadata++) {
      const bytes = encodeNormalizedFen(START);
      bytes[32] = metadata;
      expect(() => decodeNormalizedFen(bytes)).toThrow('reserved metadata');
    }
  });

  it('exhausts all en-passant byte values for both sides', () => {
    for (const side of ['w', 'b']) {
      for (let ep = 0; ep < 256; ep++) {
        const bytes = encodeNormalizedFen(START.replace(' w ', ` ${side} `));
        bytes[33] = ep;
        const valid = ep === 0 || (side === 'w' ? ep >= 41 && ep <= 48 : ep >= 17 && ep <= 24);
        if (valid) expect(encodeNormalizedFen(decodeNormalizedFen(bytes))).toEqual(bytes);
        else expect(() => decodeNormalizedFen(bytes)).toThrow();
      }
    }
  });

  it('rejects binary boards that cannot yield valid FEN', () => {
    expect(() => decodeNormalizedFen(new Uint8Array(34))).toThrow('missing white king');
    const duplicateKing = encodeNormalizedFen(SPARSE);
    duplicateKing[0] |= 6 << 4;
    expect(() => decodeNormalizedFen(duplicateKing)).toThrow('too many white kings');
    const edgePawn = encodeNormalizedFen(START);
    edgePawn[0] = (edgePawn[0] & 0xf0) | 1;
    expect(() => decodeNormalizedFen(edgePawn)).toThrow('pawns are on the edge');
  });
});
