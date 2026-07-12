import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { buildRepertoireGraph, RepertoireMoveInput } from '../src/repertoire-graph';

function path(ids: number[], moves: string[]): RepertoireMoveInput[] {
  const chess = new Chess();
  return moves.map((moveUci, index) => {
    const fenBefore = chess.fen();
    const colorToMoveBefore = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    const move = chess.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4) });
    return {
      id: ids[index], lineId: 1, parentId: index === 0 ? null : ids[index - 1], plyNumber: index + 1,
      fenBefore, fenAfter: chess.fen(), moveUci, moveSan: move!.san, colorToMoveBefore,
      isUserMove: colorToMoveBefore === 'WHITE', isCorrectUserMove: colorToMoveBefore === 'WHITE',
    };
  });
}

describe('repertoire graph path memoization', () => {
  it('preserves every branching line reference and SAN sequence', () => {
    const main = path([1, 2, 3], ['e2e4', 'e7e5', 'g1f3']);
    const branch = path([1, 4, 5], ['e2e4', 'c7c5', 'g1f3']);
    const graph = buildRepertoireGraph([{ id: 1, name: 'Branching', sideToTrain: 'WHITE', startingFen: 'startpos', moves: [...main, ...branch.slice(1)] }]);
    const refs = [...graph.positions.values()]
      .flatMap((position) => [...position.userMoves.values(), ...position.opponentMoves.values()])
      .flatMap((move) => move.lineRefs)
      .map(({ lineId, nodeId, moveSequenceSan }) => ({ lineId, nodeId, moveSequenceSan }));

    expect(refs).toEqual([
      { lineId: 1, nodeId: 1, moveSequenceSan: '1. e4' },
      { lineId: 1, nodeId: 2, moveSequenceSan: '1. e4 e5' },
      { lineId: 1, nodeId: 4, moveSequenceSan: '1. e4 c5' },
      { lineId: 1, nodeId: 3, moveSequenceSan: '1. e4 e5 2. Nf3' },
      { lineId: 1, nodeId: 5, moveSequenceSan: '1. e4 c5 2. Nf3' },
    ]);
  });
});
