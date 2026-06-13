import {
  listLines,
  createLine,
  getLineById,
  updateLine,
  deleteLine,
  getLineMoveNodes,
  copyLineToChapter,
} from '../repositories/lineRepository';
import { MoveTree, MoveTreeNode } from 'chess-domain';
import { Chess } from 'chess.js';

function colorFromFen(fen: string): 'WHITE' | 'BLACK' {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  return chess.turn() === 'w' ? 'WHITE' : 'BLACK';
}

// Build a nested move tree from database nodes. The root is always synthetic
// and never persisted; database nodes with parentId === null are first moves.
function buildMoveTree(nodes: any[], line: any): MoveTree {
  const root: MoveTreeNode = {
    node: {
      id: 0,
      lineId: line.id,
      parentId: null,
      plyNumber: 0,
      fenBefore: line.startingFen,
      fenAfter: line.startingFen,
      moveUci: '',
      moveSan: '',
      moveNumber: 0,
      colorToMoveBefore: colorFromFen(line.startingFen),
      side: colorFromFen(line.startingFen),
      isUserMove: false,
      isCorrectUserMove: false,
      sortOrder: 0,
      timesSeen: 0,
      correctCount: 0,
      incorrectCount: 0,
      currentStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    children: [],
  };

  const map = new Map<number, MoveTreeNode>();
  for (const node of nodes) {
    map.set(node.id, { node, children: [] } as MoveTreeNode);
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id);
    if (!treeNode) continue;

    if (node.parentId == null) {
      root.children.push(treeNode);
      continue;
    }

    const parent = map.get(node.parentId);
    if (parent) {
      parent.children.push(treeNode);
    }
  }

  const sortChildren = (treeNode: MoveTreeNode) => {
    treeNode.children.sort((a, b) => {
      const sortDelta = (a.node.sortOrder ?? 0) - (b.node.sortOrder ?? 0);
      if (sortDelta !== 0) return sortDelta;
      const plyDelta = a.node.plyNumber - b.node.plyNumber;
      if (plyDelta !== 0) return plyDelta;
      return a.node.id - b.node.id;
    });
    treeNode.children.forEach(sortChildren);
  };
  sortChildren(root);

  return { root };
}

export const LineService = {
  list: async (chapterId: number) => listLines(chapterId),
  create: async (chapterId: number, data: { name: string; sideToTrain: string; startingFen: string; tags?: string | null; notes?: string | null }) =>
    createLine(chapterId, data),
  get: async (id: number) => getLineById(id),
  update: async (id: number, data: Partial<{ chapterId: number; name: string; sideToTrain: string; startingFen: string; tags: string | null; notes: string | null }>) =>
    updateLine(id, data),
  copy: async (sourceLineId: number, targetChapterId: number, name?: string) =>
    copyLineToChapter(sourceLineId, targetChapterId, name),
  delete: async (id: number) => deleteLine(id),
  getMoveTree: async (lineId: number) => {
    const line = await getLineById(lineId);
    if (!line) return null;
    const nodes = await getLineMoveNodes(lineId);
    return buildMoveTree(nodes, line);
  },
};
