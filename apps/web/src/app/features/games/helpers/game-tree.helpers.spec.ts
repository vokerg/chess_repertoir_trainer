import {
  appendGameTreeChild,
  attachGameTreeAnalysis,
  buildGameTree,
  findGameTreeNode,
  parseGamePgn,
} from './game-tree.helpers';

describe('game tree helpers', () => {
  it('parses PGN and builds a tracked main line', () => {
    const moves = parseGamePgn('1. e4 e5 2. Nf3');
    const tree = buildGameTree(moves, 'WHITE', {});

    expect(moves.map((move) => move.uci)).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(findGameTreeNode(1, tree.root)?.node).toEqual(
      jasmine.objectContaining({
        moveSan: 'e4',
        isUserMove: true,
      }),
    );
    expect(findGameTreeNode(2, tree.root)?.node.isUserMove).toBeFalse();
  });

  it('adds a sideline without mutating the existing tree', () => {
    const original = buildGameTree(parseGamePgn('1. e4 e5'), 'WHITE', {});
    const parent = findGameTreeNode(1, original.root)!;
    const sideline = {
      node: {
        id: 1_000_000,
        plyNumber: null,
        moveNumber: 1,
        side: 'BLACK' as const,
        moveSan: 'c5',
        moveUci: 'c7c5',
        fenBefore: parent.node.fenAfter,
        fenAfter: parent.node.fenAfter,
        isUserMove: false,
        source: 'LOCAL' as const,
        analysisMove: null,
      },
      children: [],
    };

    const updatedRoot = appendGameTreeChild(original.root, 1, sideline);

    expect(updatedRoot).not.toBe(original.root);
    expect(findGameTreeNode(1, original.root)?.children.length).toBe(1);
    expect(findGameTreeNode(1, updatedRoot)?.children.length).toBe(2);
  });

  it('attaches saved analysis without dropping local branches', () => {
    const tree = buildGameTree(parseGamePgn('1. e4 e5'), 'WHITE', {});
    const updated = attachGameTreeAnalysis(tree.root, {
      1: {
        id: 11,
        plyNumber: 1,
        moveNumber: 1,
        side: 'WHITE',
        playedMoveUci: 'e2e4',
        playedMoveSan: 'e4',
        classification: 'BEST',
        scoreLossCp: 0,
        bestMoveUci: 'e2e4',
        bestScoreCpWhite: 20,
        playedScoreCpWhite: 20,
        positionAnalysisId: 5,
      },
    });

    expect(findGameTreeNode(1, updated)?.node.analysisMove?.classification).toBe('BEST');
    expect(findGameTreeNode(1, updated)?.children.length).toBe(1);
  });
});
