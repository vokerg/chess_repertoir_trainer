import {
  CoverageGameMetadata,
  CoverageLineNode,
  CoveragePly,
  LineCoverageGame,
  LineCoverageStatus,
  RepertoireColor,
} from './repertoire-coverage.types';

function sideToMove(normalizedFen: string): RepertoireColor {
  const side = normalizedFen.split(/\s+/)[1];
  if (side === 'w') return 'WHITE';
  if (side === 'b') return 'BLACK';
  throw new Error(`Invalid normalized FEN: ${normalizedFen}`);
}

function baseResult(game: CoverageGameMetadata, status: LineCoverageStatus): LineCoverageGame {
  return {
    ...game,
    endedAt: game.endedAt?.toISOString() ?? null,
    importedAt: game.importedAt?.toISOString() ?? null,
    status,
    plyNumber: null,
    fenBefore: null,
    normalizedFenBefore: null,
    sideToMove: null,
    expectedMoveUci: null,
    expectedMoveUcis: [],
    expectedMoveSans: [],
    playedMoveUci: null,
    playedSan: null,
    matchedLineNodeId: null,
    parentLineNodeId: null,
  };
}

function atPly(
  game: CoverageGameMetadata,
  status: LineCoverageStatus,
  ply: CoveragePly,
  parentLineNodeId: number | null,
  side: RepertoireColor,
): LineCoverageGame {
  return {
    ...baseResult(game, status),
    plyNumber: ply.plyNumber,
    fenBefore: ply.normalizedFenBefore,
    normalizedFenBefore: ply.normalizedFenBefore,
    sideToMove: side,
    playedMoveUci: ply.moveUci,
    matchedLineNodeId: parentLineNodeId,
    parentLineNodeId,
  };
}

export function classifyLineCoverageGame(input: {
  game: CoverageGameMetadata;
  plies: CoveragePly[] | null;
  nodes: CoverageLineNode[];
  normalizedStartFen: string;
  sideToTrain: RepertoireColor;
  indexed: boolean;
}): LineCoverageGame {
  const { game, nodes, normalizedStartFen, sideToTrain } = input;
  if (!input.indexed || !input.plies?.length) return baseResult(game, 'UNINDEXED_GAME');

  const plies = [...input.plies].sort((a, b) => a.plyNumber - b.plyNumber);
  const startIndex = plies.findIndex((ply) => ply.normalizedFenBefore === normalizedStartFen);
  if (startIndex < 0) return baseResult(game, 'NOT_REACHED');

  const childrenByParentId = new Map<number | null, CoverageLineNode[]>();
  for (const node of nodes) {
    const children = childrenByParentId.get(node.parentId) ?? [];
    children.push(node);
    childrenByParentId.set(node.parentId, children);
  }

  let currentNodeId: number | null = null;
  for (let index = startIndex; index < plies.length; index++) {
    const ply = plies[index];
    let side: RepertoireColor;
    try {
      side = sideToMove(ply.normalizedFenBefore);
    } catch {
      return baseResult(game, 'UNINDEXED_GAME');
    }

    const children: CoverageLineNode[] = childrenByParentId.get(currentNodeId) ?? [];
    if (children.length === 0) return atPly(game, 'LINE_ENDED', ply, currentNodeId, side);

    const isUserMove = side === sideToTrain;
    const allowedChildren: CoverageLineNode[] = isUserMove
      ? children.filter((child) => child.isUserMove && child.isCorrectUserMove)
      : children;
    const matchingChild: CoverageLineNode | undefined = allowedChildren.find(
      (child) => child.moveUci === ply.moveUci,
    );

    if (!matchingChild) {
      const status: LineCoverageStatus = isUserMove ? 'USER_DEVIATION' : 'OPPONENT_UNCOVERED';
      const result = atPly(game, status, ply, currentNodeId, side);
      if (isUserMove) {
        const expected: CoverageLineNode[] = children.filter(
          (child) => child.isUserMove && child.isCorrectUserMove,
        );
        result.expectedMoveUcis = expected.map((child) => child.moveUci);
        result.expectedMoveSans = expected.map((child) => child.moveSan);
        result.expectedMoveUci = expected.length === 1 ? expected[0].moveUci : null;
      }
      return result;
    }

    currentNodeId = matchingChild.id;
  }

  return {
    ...baseResult(game, 'MATCHED_LINE'),
    matchedLineNodeId: currentNodeId,
    parentLineNodeId: currentNodeId,
  };
}
