import { Chess } from 'chess.js';
import { MoveTree, MoveTreeNode } from 'chess-domain';

function colorFromFen(fen: string): 'WHITE' | 'BLACK' {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  return chess.turn() === 'w' ? 'WHITE' : 'BLACK';
}

export function buildMoveTreeFromNodes(nodes: any[], line: any): MoveTree {
  const rootColor = colorFromFen(line.startingFen);
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
      colorToMoveBefore: rootColor,
      side: rootColor,
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
  for (const node of nodes) map.set(node.id, { node, children: [] } as MoveTreeNode);

  for (const node of nodes) {
    const treeNode = map.get(node.id);
    if (!treeNode) continue;
    if (node.parentId == null) root.children.push(treeNode);
    else map.get(node.parentId)?.children.push(treeNode);
  }

  const sortChildren = (treeNode: MoveTreeNode) => {
    treeNode.children.sort((a, b) => {
      const sortDelta = (a.node.sortOrder ?? 0) - (b.node.sortOrder ?? 0);
      if (sortDelta !== 0) return sortDelta;
      const plyDelta = a.node.plyNumber - b.node.plyNumber;
      return plyDelta !== 0 ? plyDelta : a.node.id - b.node.id;
    });
    treeNode.children.forEach(sortChildren);
  };
  sortChildren(root);

  return { root };
}
