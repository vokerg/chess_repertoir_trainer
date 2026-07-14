import { Chess } from 'chess.js';
import { uciMovesToSan } from './uci-to-san.helper';

describe('uciMovesToSan', () => {
  it('converts knight moves', () => {
    expect(uciMovesToSan(new Chess().fen(), ['g1f3'])).toEqual(['Nf3']);
  });

  it('converts captures', () => {
    expect(
      uciMovesToSan('8/8/8/3p4/4P3/8/8/4K2k w - - 0 1', ['e4d5']),
    ).toEqual(['exd5']);
  });

  it('converts castling', () => {
    expect(
      uciMovesToSan('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', ['e1g1']),
    ).toEqual(['O-O']);
  });

  it('converts promotion and check', () => {
    expect(
      uciMovesToSan('7k/P7/8/8/8/8/8/7K w - - 0 1', ['a7a8q']),
    ).toEqual(['a8=Q+']);
  });

  it('converts a checking move', () => {
    expect(
      uciMovesToSan('7k/8/8/8/8/8/8/R3K3 w Q - 0 1', ['a1a8']),
    ).toEqual(['Ra8+']);
  });

  it('converts mate while applying moves sequentially', () => {
    expect(
      uciMovesToSan(new Chess().fen(), ['f2f3', 'e7e5', 'g2g4', 'd8h4']),
    ).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
  });
});
