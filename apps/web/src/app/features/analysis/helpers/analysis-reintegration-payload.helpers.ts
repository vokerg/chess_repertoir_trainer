import { FreeAnalysisTree, FreeAnalysisTreeNode } from './free-analysis-tree.models';
import { AnalysisReintegrationMovePayload, AnalysisReintegrationTreePayload } from '../data-access/analysis-reintegration.models';

export function buildAnalysisReintegrationPayload(tree: FreeAnalysisTree): AnalysisReintegrationTreePayload {
  return { rootFen: tree.root.node.fenAfter,
    children: tree.root.children.map(toPayloadMove).filter(isPayloadMove) };
}

export function buildAnalysisReintegrationLinePayload(
  tree: FreeAnalysisTree,
  selectedNodeId: number,
): AnalysisReintegrationTreePayload {
  const path = findPathToNode(tree.root, selectedNodeId);
  if (!path || path.length <= 1) return buildAnalysisReintegrationPayload(tree);
  return { rootFen: tree.root.node.fenAfter, children: buildPathPayload(path.slice(1)) };
}

function toPayloadMove(node: FreeAnalysisTreeNode): AnalysisReintegrationMovePayload | null {
  if (!node.node.moveUci) return null;
  return { moveUci: node.node.moveUci, children: node.children.map(toPayloadMove).filter(isPayloadMove) };
}

function buildPathPayload(path: FreeAnalysisTreeNode[]): AnalysisReintegrationMovePayload[] {
  const [head, ...tail] = path;
  const move = toPayloadMove(head);
  if (!move) return [];
  move.children = tail.length ? buildPathPayload(tail) : [];
  return [move];
}

function findPathToNode(
  node: FreeAnalysisTreeNode,
  selectedNodeId: number,
  path: FreeAnalysisTreeNode[] = [],
): FreeAnalysisTreeNode[] | null {
  const nextPath = [...path, node];
  if (node.node.id === selectedNodeId) return nextPath;
  for (const child of node.children) {
    const found = findPathToNode(child, selectedNodeId, nextPath);
    if (found) return found;
  }
  return null;
}

function isPayloadMove(move: AnalysisReintegrationMovePayload | null): move is AnalysisReintegrationMovePayload {
  return move !== null;
}

export function countAnalysisReintegrationPayloadMoves(tree: AnalysisReintegrationTreePayload): number {
  const count = (children: AnalysisReintegrationMovePayload[]): number =>
    children.reduce((sum, child) => sum + 1 + count(child.children), 0);
  return count(tree.children);
}
