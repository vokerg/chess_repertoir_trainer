import {
  listLines,
  createLine,
  getLineById,
  updateLine,
  deleteLine,
  getLineMoveNodes,
} from '../repositories/lineRepository';
import { importTreeFromJson, MoveTree, MoveTreeNode } from 'chess-domain';

// Helper to build a nested move tree from a flat list of nodes.
function buildMoveTree(nodes: any[], lineStartingFen: string): MoveTree {
  // Create a map from id to MoveTreeNode
  const map: Record<number, MoveTreeNode> = {};
  nodes.forEach((node) => {
    map[node.id] = { node, children: [] } as MoveTreeNode;
  });
  // Initialize root with starting position if exists
  const rootNodes = nodes.filter((n) => n.parentId === null);
  let root: MoveTreeNode;
  if (rootNodes.length > 0) {
    root = map[rootNodes[0].id];
  } else {
    // If no root in DB, create a synthetic root
    root = {
      node: {
        id: 0,
        lineId: nodes[0]?.lineId || 0,
        parentId: null,
        plyNumber: 0,
        fenBefore: lineStartingFen,
        fenAfter: lineStartingFen,
        moveUci: '',
        moveSan: '',
        moveNumber: 0,
        colorToMoveBefore: 'WHITE',
        side: 'WHITE',
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
  }
  // Build tree by linking children
  nodes.forEach((n) => {
    const node = map[n.id];
    if (n.parentId != null) {
      const parent = map[n.parentId];
      if (parent) {
        parent.children.push(node);
      }
    }
  });
  return { root };
}

export const LineService = {
  list: async (chapterId: number) => listLines(chapterId),
  create: async (chapterId: number, data: { name: string; sideToTrain: string; startingFen: string; tags?: string | null; notes?: string | null }) =>
    createLine(chapterId, data),
  get: async (id: number) => getLineById(id),
  update: async (id: number, data: Partial<{ name: string; sideToTrain: string; startingFen: string; tags: string | null; notes: string | null }>) =>
    updateLine(id, data),
  delete: async (id: number) => deleteLine(id),
  getMoveTree: async (lineId: number) => {
    const line = await getLineById(lineId);
    if (!line) return null;
    const nodes = await getLineMoveNodes(lineId);
    const tree = buildMoveTree(nodes, line.startingFen);
    return tree;
  },
};