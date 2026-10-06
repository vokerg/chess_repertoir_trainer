import type { AnalysisTreeNode } from '../workbench/analysis-tree.models';

export interface MoveTreeIndex {
  readonly nodesById: ReadonlyMap<number, AnalysisTreeNode>;
  readonly parentById: ReadonlyMap<number, AnalysisTreeNode>;
  readonly moveCount: number;
}

export interface MoveScoreRow {
  readonly id: number;
  readonly number: number | null;
  white: AnalysisTreeNode | null;
  black: AnalysisTreeNode | null;
}

export function indexMoveTree(root: AnalysisTreeNode): MoveTreeIndex {
  const nodesById = new Map<number, AnalysisTreeNode>();
  const parentById = new Map<number, AnalysisTreeNode>();
  let moveCount = 0;
  const visit = (node: AnalysisTreeNode, parent: AnalysisTreeNode | null): void => {
    nodesById.set(node.node.id, node);
    if (node.node.id !== 0) moveCount += 1;
    if (parent) parentById.set(node.node.id, parent);
    for (const child of node.children) visit(child, node);
  };
  visit(root, null);
  return { nodesById, parentById, moveCount };
}

export function pathToMove(index: MoveTreeIndex, id: number): AnalysisTreeNode[] | null {
  let node = index.nodesById.get(id);
  if (!node) return null;
  const path: AnalysisTreeNode[] = [];
  while (node) {
    path.unshift(node);
    node = index.parentById.get(node.node.id);
  }
  return path;
}

export function firstChildSequence(
  start: AnalysisTreeNode | null | undefined,
  preferredContinuations: ReadonlyMap<number, number> = new Map(),
): AnalysisTreeNode[] {
  const nodes: AnalysisTreeNode[] = [];
  let current = start ?? null;
  while (current) {
    nodes.push(current);
    const preferredId = preferredContinuations.get(current.node.id);
    current = current.children.find((child) => child.node.id === preferredId) ?? current.children[0] ?? null;
  }
  return nodes;
}

export function pairMoveRows(nodes: readonly AnalysisTreeNode[]): MoveScoreRow[] {
  const rows: MoveScoreRow[] = [];
  for (const current of nodes) {
    const number = current.node.moveNumber ?? null;
    const side = current.node.side;
    const last = rows.at(-1);
    if (!last || last.number !== number || (side === 'WHITE' ? last.white : last.black)) {
      rows.push({ id: current.node.id, number, white: null, black: null });
    }
    const row = rows.at(-1)!;
    if (side === 'WHITE') row.white = current;
    else row.black = current;
  }
  return rows;
}
