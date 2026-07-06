import { describe, expect, it } from 'vitest';
import {
  firstUciMove,
  parseUciInfoLine,
  scoreFromSideToMoveToWhite,
  shapePositionAnalysisForStorage,
  storedEngineLineFromUciInfo,
} from './stockfish-analysis';

describe('stockfish analysis helpers', () => {
  it('parses UCI info and converts scores to white POV', () => {
    const parsed = parseUciInfoLine('info depth 12 multipv 1 score cp 34 pv e2e4 e7e5');

    expect(parsed).toEqual({
      multipv: 1,
      depth: 12,
      scoreCp: 34,
      moveUci: 'e2e4',
      pvUci: ['e2e4', 'e7e5'],
    });
    expect(storedEngineLineFromUciInfo(parsed!, 'b')).toEqual({
      multipv: 1,
      depth: 12,
      moveUci: 'e2e4',
      scoreCpWhite: -34,
      pvUci: ['e2e4', 'e7e5'],
    });
  });

  it('shapes compact storage without PV lines and rich storage with normalized lines', () => {
    const input = {
      fen: '8/8/8/8/8/8/4K3/6k1 w - - 0 1',
      bestMoveUci: 'E2E3 e7e5',
      lines: [{ multipv: 1, depth: 12, scoreCpWhite: 25, pvUci: ['E2E3', 'bad'] }],
    };

    expect(firstUciMove(input.bestMoveUci)).toBe('e2e3');
    expect(scoreFromSideToMoveToWhite(25, input.fen)).toBe(25);

    expect(shapePositionAnalysisForStorage(input, 'compact')).toEqual({
      fen: input.fen,
      bestMoveUci: 'e2e3',
      bestScoreCpWhite: 25,
      bestMateWhite: null,
      persistenceMode: 'compact',
    });
    expect(shapePositionAnalysisForStorage(input, 'rich')).toEqual({
      fen: input.fen,
      bestMoveUci: 'e2e3',
      bestScoreCpWhite: 25,
      bestMateWhite: null,
      persistenceMode: 'rich',
      lines: [{ multipv: 1, depth: 12, moveUci: 'e2e3', scoreCpWhite: 25, pvUci: ['e2e3'] }],
    });
  });
});
