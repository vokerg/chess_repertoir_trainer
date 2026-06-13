import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  AnalysisMergeTree,
  previewChapterReintegration,
} from '../src/repertoire-merge-planner';
import { RepertoireLineInput, RepertoireMoveInput } from '../src/repertoire-graph';

function makeLine(id: number, name: string, moves: string[]): RepertoireLineInput {
  const chess = new Chess();
  const nodes: RepertoireMoveInput[] = moves.map((moveUci, index) => {
    const fenBefore = chess.fen();
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci[4],
    });
    if (!move) throw new Error(`Illegal test move: ${moveUci}`);
    return {
      id: id * 100 + index + 1,
      lineId: id,
      parentId: index === 0 ? null : id * 100 + index,
      plyNumber: index + 1,
      fenBefore,
      fenAfter: chess.fen(),
      moveUci,
      moveSan: move.san,
      colorToMoveBefore: index % 2 === 0 ? 'WHITE' : 'BLACK',
      isUserMove: index % 2 === 0,
      isCorrectUserMove: index % 2 === 0,
    };
  });
  return { id, name, sideToTrain: 'WHITE', startingFen: new Chess().fen(), moves: nodes };
}

function makeAnalysisTree(moves: string[]): AnalysisMergeTree {
  const root: AnalysisMergeTree = { rootFen: new Chess().fen(), children: [] };
  let children = root.children;
  for (const moveUci of moves) {
    const child = { moveUci, children: [] };
    children.push(child);
    children = child.children;
  }
  return root;
}

describe('previewChapterReintegration', () => {
  it('returns only the best-fitting existing line while preserving course-wide new-line conflicts', () => {
    const accepted = makeLine(1, 'QG Accepted', [
      'd2d4', 'd7d5', 'c2c4', 'd5c4', 'e2e4',
    ]);
    const e6Line = makeLine(2, 'e6 line', [
      'd2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5',
    ]);

    const preview = previewChapterReintegration({
      analysisTree: makeAnalysisTree(['d2d4', 'd7d5', 'c2c4', 'd5c4', 'e2e3']),
      chapterLines: [accepted, e6Line],
      courseLines: [accepted, e6Line],
      newLineSideToTrain: 'WHITE',
    });

    expect(preview.candidates.map((candidate) => candidate.lineName)).toEqual(['QG Accepted']);
    expect(preview.candidates[0].counts.reusedMoves).toBe(4);
    expect(preview.newLine.allowed).toBe(false);
    expect(preview.newLine.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        proposedMoveUci: 'e2e3',
        existingMoves: expect.arrayContaining([
          expect.objectContaining({ moveUci: 'e2e4' }),
        ]),
      }),
    ]));
  });

  it('keeps all existing-line options when none reuse an analysis move', () => {
    const d4Line = makeLine(1, 'd4 line', ['d2d4']);
    const c4Line = makeLine(2, 'c4 line', ['c2c4']);

    const preview = previewChapterReintegration({
      analysisTree: makeAnalysisTree(['e2e4']),
      chapterLines: [d4Line, c4Line],
      courseLines: [d4Line, c4Line],
    });

    expect(preview.candidates.map((candidate) => candidate.lineName)).toEqual([
      'd4 line', 'c4 line',
    ]);
  });

  it('keeps all existing-line candidates tied for the highest reused-move count', () => {
    const first = makeLine(1, 'first d4 line', ['d2d4', 'd7d5']);
    const second = makeLine(2, 'second d4 line', ['d2d4', 'g8f6']);
    const e4Line = makeLine(3, 'e4 line', ['e2e4']);

    const preview = previewChapterReintegration({
      analysisTree: makeAnalysisTree(['d2d4', 'c7c5']),
      chapterLines: [first, second, e4Line],
      courseLines: [first, second, e4Line],
    });

    expect(preview.candidates.map((candidate) => candidate.lineName)).toEqual([
      'first d4 line', 'second d4 line',
    ]);
  });
});
