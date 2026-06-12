import { FreeAnalysisTree, FreeAnalysisTreeNode } from './free-analysis-tree.models';
import { AnalysisReintegrationMovePayload, AnalysisReintegrationTreePayload } from '../data-access/analysis-reintegration.models';

export function buildAnalysisReintegrationPayload(tree: FreeAnalysisTree): AnalysisReintegrationTreePayload {
  return { rootFen: tree.root.node.fenAfter,
    children: tree.root.children.map(toPayloadMove).filter(isPayloadMove) };
}

function toPayloadMove(node: FreeAnalysisTreeNode): AnalysisReintegrationMovePayload | null {
  if (!node.node.moveUci) return null;
  return { moveUci: node.node.moveUci, children: node.children.map(toPayloadMove).filter(isPayloadMove) };
}

function isPayloadMove(move: AnalysisReintegrationMovePayload | null): move is AnalysisReintegrationMovePayload {
  return move !== null;
}

export function countAnalysisReintegrationPayloadMoves(tree: AnalysisReintegrationTreePayload): number {
  const count = (children: AnalysisReintegrationMovePayload[]): number =>
    children.reduce((sum, child) => sum + 1 + count(child.children), 0);
  return count(tree.children);
}
