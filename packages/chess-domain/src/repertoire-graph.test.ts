import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { buildRepertoireGraph, getRepertoireConflicts, RepertoireLineInput } from './repertoire-graph';

function makeLine(id: number, sideToTrain: 'WHITE' | 'BLACK', moves: string[]): RepertoireLineInput {
  const chess = new Chess();
  let parentId: number | null = null;
  return {
    id, name: `Line ${id}`, sideToTrain, startingFen: 'startpos',
    moves: moves.map((moveUci, index) => {
      const fenBefore = chess.fen();
      const colorToMoveBefore = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
      const move = chess.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci[4] });
      const node = { id: id * 100 + index + 1, lineId: id, parentId, plyNumber: index + 1,
        fenBefore, fenAfter: chess.fen(), moveUci, moveSan: move!.san, colorToMoveBefore,
        isUserMove: colorToMoveBefore === sideToTrain,
        isCorrectUserMove: colorToMoveBefore === sideToTrain };
      parentId = node.id;
      return node;
    }),
  };
}

describe('repertoire graph', () => {
  it('normalizes clock fields and reports different trained-side moves', () => {
    const a = makeLine(1, 'BLACK', ['e2e4', 'c7c5']);
    const b = makeLine(2, 'BLACK', ['e2e4', 'e7e5']);
    b.moves[1].fenBefore = b.moves[1].fenBefore.replace(/\d+ \d+$/, '9 42');
    const conflicts = getRepertoireConflicts(buildRepertoireGraph([a, b]));
    expect(conflicts).toHaveLength(1);
    expect(new Set(conflicts[0].moves.map((move) => move.moveUci))).toEqual(new Set(['c7c5', 'e7e5']));
  });

  it('does not conflict for the same trained move or opponent branches', () => {
    expect(getRepertoireConflicts(buildRepertoireGraph([
      makeLine(1, 'BLACK', ['e2e4', 'c7c5']), makeLine(2, 'BLACK', ['e2e4', 'c7c5']),
    ]))).toHaveLength(0);
    expect(getRepertoireConflicts(buildRepertoireGraph([
      makeLine(3, 'BLACK', ['e2e4']), makeLine(4, 'BLACK', ['d2d4']),
    ]))).toHaveLength(0);
  });
});
