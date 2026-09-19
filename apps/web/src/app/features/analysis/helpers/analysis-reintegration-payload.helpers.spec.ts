import {
  buildAnalysisReintegrationLinePayload,
  buildAnalysisReintegrationPayload,
} from './analysis-reintegration-payload.helpers';
import { FreeAnalysisTreeNode } from './free-analysis-tree.models';

function node(
  id: number,
  moveUci: string | null,
  fenAfter: string,
  children: FreeAnalysisTreeNode[] = [],
): FreeAnalysisTreeNode {
  return {
    node: {
      id,
      moveNumber: null,
      side: null,
      moveSan: moveUci,
      moveUci,
      fenBefore: 'before',
      fenAfter,
      isUserMove: false,
      moveMeta: null,
      source: 'LOCAL',
    },
    children,
  };
}

describe('analysis reintegration payload helpers', () => {
  const selectedLine = node(1, 'e2e4', 'fen-1', [
    node(2, 'e7e5', 'fen-2', [node(3, 'g1f3', 'fen-3')]),
    node(4, 'c7c5', 'fen-4'),
  ]);
  const tree = { root: node(0, null, 'startpos', [selectedLine, node(5, 'd2d4', 'fen-5')]) };

  it('exports the whole analysis tree for tree payloads', () => {
    expect(buildAnalysisReintegrationPayload(tree).children).toEqual([
      {
        moveUci: 'e2e4',
        children: [
          { moveUci: 'e7e5', children: [{ moveUci: 'g1f3', children: [] }] },
          { moveUci: 'c7c5', children: [] },
        ],
      },
      { moveUci: 'd2d4', children: [] },
    ]);
  });

  it('exports only the selected path for line payloads', () => {
    expect(buildAnalysisReintegrationLinePayload(tree, 3).children).toEqual([
      {
        moveUci: 'e2e4',
        children: [
          {
            moveUci: 'e7e5',
            children: [{ moveUci: 'g1f3', children: [] }],
          },
        ],
      },
    ]);
  });
});
