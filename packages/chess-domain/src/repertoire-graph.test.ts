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

  it('preserves line references and SAN paths for a branching line', () => {
    const line = makeLine(5, 'WHITE', ['e2e4', 'e7e5', 'g1f3']);
    const branch = makeLine(6, 'WHITE', ['e2e4', 'c7c5', 'g1f3']);
    branch.id = line.id;
    branch.name = line.name;
    branch.moves.forEach((move, index) => {
      move.lineId = line.id;
      move.id = 600 + index;
      move.parentId = index === 0 ? null : branch.moves[index - 1].id;
    });
    branch.moves[0] = line.moves[0];
    branch.moves[1].parentId = line.moves[0].id;
    const branchingLine = { ...line, moves: [...line.moves, ...branch.moves.slice(1)] };

    const graph = buildRepertoireGraph([branchingLine]);
    const refs = [...graph.positions.values()]
      .flatMap((position) => [...position.userMoves.values(), ...position.opponentMoves.values()])
      .flatMap((move) => move.lineRefs)
      .map((ref) => ({ nodeId: ref.nodeId, lineId: ref.lineId, moveSequenceSan: ref.moveSequenceSan }));

    expect(refs).toEqual([
      { nodeId: 501, lineId: 5, moveSequenceSan: '1. e4' },
      { nodeId: 502, lineId: 5, moveSequenceSan: '1. e4 e5' },
      { nodeId: 503, lineId: 5, moveSequenceSan: '1. e4 e5 2. Nf3' },
      { nodeId: 601, lineId: 5, moveSequenceSan: '1. e4 c5' },
      { nodeId: 602, lineId: 5, moveSequenceSan: '1. e4 c5 2. Nf3' },
    ]);
  });
});
