import {
  FreeAnalysisTreeNode,
} from './free-analysis-tree.models';
import { Chess } from 'chess.js';

export function buildFreeAnalysisRoot(fen: string): FreeAnalysisTreeNode {
  return {
    node: {
      id: 0,
      moveNumber: null,
      side: null,
      moveSan: null,
      moveUci: null,
      fenBefore: fen,
      fenAfter: fen,
      isUserMove: false,
      moveMeta: null,
      source: 'LOCAL',
    },
    children: [],
  };
}

export function buildFreeAnalysisGameTree(
  pgn: string,
  userColor?: 'WHITE' | 'BLACK' | null,
  throughPly?: number | null,
): FreeAnalysisTreeNode {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const gameMoves = chess.history({ verbose: true }) as Array<{
    color: 'w' | 'b';
    san: string;
    from: string;
    to: string;
    promotion?: string;
    before: string;
    after: string;
  }>;
  const moves = throughPly && throughPly > 0 ? gameMoves.slice(0, throughPly) : gameMoves;
  const startingFen = moves[0]?.before || new Chess().fen();
  const root: FreeAnalysisTreeNode = {
    node: {
      id: 0,
      moveNumber: null,
      side: null,
      moveSan: null,
      moveUci: null,
      fenBefore: startingFen,
      fenAfter: startingFen,
      isUserMove: false,
      moveMeta: null,
      source: 'GAME',
    },
    children: [],
  };

  let parent = root;
  moves.forEach((move, index) => {
    const side = move.color === 'b' ? 'BLACK' : 'WHITE';
    const child: FreeAnalysisTreeNode = {
      node: {
        id: index + 1,
        moveNumber: Number(move.before.split(' ')[5]) || Math.ceil((index + 1) / 2),
        side,
        moveSan: move.san,
        moveUci: `${move.from}${move.to}${move.promotion || ''}`,
        fenBefore: move.before,
        fenAfter: move.after,
        isUserMove: userColor ? side === userColor : side === 'WHITE',
        moveMeta: side === 'WHITE' ? 'white' : 'black',
        source: 'GAME',
      },
      children: [],
    };
    parent.children = [child];
    parent = child;
  });

  return root;
}

export function findFreeAnalysisNode(
  id: number,
  root?: FreeAnalysisTreeNode | null,
): FreeAnalysisTreeNode | null {
  if (!root) return null;
  if (root.node.id === id) return root;
  for (const child of root.children) {
    const found = findFreeAnalysisNode(id, child);
    if (found) return found;
  }
  return null;
}

export function findFreeAnalysisParent(
  id: number,
  root?: FreeAnalysisTreeNode | null,
  parent: FreeAnalysisTreeNode | null = null,
): FreeAnalysisTreeNode | null {
  if (!root) return null;
  if (root.node.id === id) return parent;
  for (const child of root.children) {
    const found = findFreeAnalysisParent(id, child, root);
    if (found) return found;
  }
  return null;
}

export function appendFreeAnalysisChild(
  root: FreeAnalysisTreeNode,
  parentId: number,
  child: FreeAnalysisTreeNode,
): FreeAnalysisTreeNode {
  if (root.node.id === parentId) return { ...root, children: [...root.children, child] };
  return {
    ...root,
    children: root.children.map((current) =>
      appendFreeAnalysisChild(current, parentId, child),
    ),
  };
}

export function removeFreeAnalysisSubtree(
  root: FreeAnalysisTreeNode,
  nodeId: number,
): FreeAnalysisTreeNode {
  const removeFromNode = (node: FreeAnalysisTreeNode): FreeAnalysisTreeNode => {
    const retainedChildren = node.children.filter((child) => child.node.id !== nodeId);
    const children = retainedChildren.map((child) => removeFromNode(child));
    const changed =
      retainedChildren.length !== node.children.length ||
      children.some((child, index) => child !== retainedChildren[index]);
    return changed ? { ...node, children } : node;
  };

  const updated = removeFromNode(root);
  return updated === root ? { ...root } : updated;
}

export function countFreeAnalysisDescendants(node?: FreeAnalysisTreeNode | null): number {
  if (!node) return 0;
  return node.children.reduce(
    (count, child) => count + 1 + countFreeAnalysisDescendants(child),
    0,
  );
}
