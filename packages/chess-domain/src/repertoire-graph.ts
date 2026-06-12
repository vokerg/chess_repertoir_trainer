import { formatMoveSequence } from './move-sequence';
import { normalizeFenForPosition } from './position';

export type RepertoireColor = 'WHITE' | 'BLACK';

export interface RepertoireLineInput {
  id: number;
  name: string;
  chapterId?: number;
  sideToTrain: RepertoireColor;
  startingFen: string;
  moves: RepertoireMoveInput[];
}

export interface RepertoireMoveInput {
  id: number;
  lineId: number;
  parentId: number | null;
  plyNumber: number;
  fenBefore: string;
  fenAfter: string;
  moveUci: string;
  moveSan: string;
  colorToMoveBefore: RepertoireColor | string;
  isUserMove: boolean;
  isCorrectUserMove: boolean;
}

export interface RepertoireLineRef {
  lineId: number;
  lineName: string;
  nodeId: number | null;
  moveSequenceSan?: string | null;
}

export interface RepertoireGraphMove {
  moveUci: string;
  moveSan: string;
  fenAfter: string;
  normalizedFenAfter: string;
  lineRefs: RepertoireLineRef[];
}

export interface RepertoireGraphPosition {
  normalizedFen: string;
  sideToMove: RepertoireColor;
  lineRefs: RepertoireLineRef[];
  userMoves: Map<string, RepertoireGraphMove>;
  opponentMoves: Map<string, RepertoireGraphMove>;
}

export interface RepertoireGraph {
  startPositions: Set<string>;
  positions: Map<string, RepertoireGraphPosition>;
}

export interface RepertoireConflict {
  normalizedFenBefore: string;
  sideToMove: RepertoireColor;
  moves: Array<{
    moveUci: string;
    moveSan: string;
    lineRefs: RepertoireLineRef[];
  }>;
}

export function sideToMoveFromFen(fen: string): RepertoireColor {
  const activeColor = normalizeFenForPosition(fen).split(/\s+/)[1];
  if (activeColor === 'w') return 'WHITE';
  if (activeColor === 'b') return 'BLACK';
  throw new Error(`Invalid FEN active color: ${fen}`);
}

export function buildRepertoireGraph(lines: RepertoireLineInput[]): RepertoireGraph {
  const graph: RepertoireGraph = { startPositions: new Set(), positions: new Map() };

  for (const line of lines) {
    const startKey = normalizeFenForPosition(line.startingFen || 'startpos');
    graph.startPositions.add(startKey);
    const startPosition = getOrCreatePosition(graph, startKey, line.startingFen);
    addUniqueRef(startPosition.lineRefs, { lineId: line.id, lineName: line.name, nodeId: null });

    for (const node of line.moves) {
      const key = normalizeFenForPosition(node.fenBefore);
      const position = getOrCreatePosition(graph, key, node.fenBefore);
      addUniqueRef(position.lineRefs, {
        lineId: line.id,
        lineName: line.name,
        nodeId: node.id,
      });

      const moveMap =
        node.isUserMove && node.isCorrectUserMove ? position.userMoves : position.opponentMoves;
      let graphMove = moveMap.get(node.moveUci);
      if (!graphMove) {
        graphMove = {
          moveUci: node.moveUci,
          moveSan: node.moveSan,
          fenAfter: node.fenAfter,
          normalizedFenAfter: normalizeFenForPosition(node.fenAfter),
          lineRefs: [],
        };
        moveMap.set(node.moveUci, graphMove);
      }
      addUniqueRef(graphMove.lineRefs, {
        lineId: line.id,
        lineName: line.name,
        nodeId: node.id,
        moveSequenceSan: formatPathToNode(line.moves, node.id),
      });
    }
  }

  return graph;
}

export function getRepertoireConflicts(graph: RepertoireGraph): RepertoireConflict[] {
  return [...graph.positions.values()]
    .filter((position) => position.userMoves.size > 1)
    .map((position) => ({
      normalizedFenBefore: position.normalizedFen,
      sideToMove: position.sideToMove,
      moves: [...position.userMoves.values()].map((move) => ({
        moveUci: move.moveUci,
        moveSan: move.moveSan,
        lineRefs: move.lineRefs,
      })),
    }));
}

export function formatPathToNode(
  moves: RepertoireMoveInput[],
  nodeId: number,
): string | null {
  const nodesById = new Map(moves.map((node) => [node.id, node]));
  const path: RepertoireMoveInput[] = [];
  const visited = new Set<number>();
  let current = nodesById.get(nodeId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.push(current);
    current = current.parentId === null ? undefined : nodesById.get(current.parentId);
  }
  if (path.length === 0 || current) return null;
  return formatMoveSequence(
    path.reverse().map((node) => ({ san: node.moveSan, plyNumber: node.plyNumber })),
  );
}

function getOrCreatePosition(
  graph: RepertoireGraph,
  normalizedFen: string,
  sourceFen: string,
): RepertoireGraphPosition {
  let position = graph.positions.get(normalizedFen);
  if (!position) {
    position = {
      normalizedFen,
      sideToMove: sideToMoveFromFen(sourceFen),
      lineRefs: [],
      userMoves: new Map(),
      opponentMoves: new Map(),
    };
    graph.positions.set(normalizedFen, position);
  }
  return position;
}

function addUniqueRef(refs: RepertoireLineRef[], ref: RepertoireLineRef): void {
  if (!refs.some((item) => item.lineId === ref.lineId && item.nodeId === ref.nodeId)) {
    refs.push(ref);
  }
}
