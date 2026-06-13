import { MoveTree, MoveTreeNode } from './types';

export interface AvailableSublineMove {
  nodeId: number;
  moveUci: string;
  moveSan: string;
  plyNumber: number;
  sortOrder: number;
}

export interface AvailableSubline {
  leafNodeId: number;
  moves: AvailableSublineMove[];
}

function compareNodes(a: MoveTreeNode, b: MoveTreeNode): number {
  const sortDelta = (a.node.sortOrder ?? 0) - (b.node.sortOrder ?? 0);
  if (sortDelta !== 0) return sortDelta;
  const plyDelta = a.node.plyNumber - b.node.plyNumber;
  if (plyDelta !== 0) return plyDelta;
  return a.node.id - b.node.id;
}

export function extractAvailableSublines(tree: MoveTree): AvailableSubline[] {
  if (tree.root.children.length === 0) return [];

  const sublines: AvailableSubline[] = [];

  const visit = (node: MoveTreeNode, path: AvailableSublineMove[]) => {
    const nextPath = node.node.id === 0
      ? path
      : [
          ...path,
          {
            nodeId: node.node.id,
            moveUci: node.node.moveUci,
            moveSan: node.node.moveSan,
            plyNumber: node.node.plyNumber,
            sortOrder: node.node.sortOrder ?? 0,
          },
        ];
    const children = [...node.children].sort(compareNodes);

    if (children.length === 0) {
      if (nextPath.length > 0) {
        sublines.push({ leafNodeId: node.node.id, moves: nextPath });
      }
      return;
    }

    children.forEach((child) => visit(child, nextPath));
  };

  visit(tree.root, []);
  return sublines;
}
