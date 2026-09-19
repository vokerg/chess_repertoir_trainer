import { AnalysisTree, AnalysisTreeNode } from '../../../shared/analysis/workbench/analysis-tree.models';

export interface FreeAnalysisTreeNodeData {
  id: number;
  moveNumber: number | null;
  side: 'WHITE' | 'BLACK' | null;
  moveSan: string | null;
  moveUci: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
  moveMeta: string | null;
  source: 'GAME' | 'LOCAL';
}

export interface FreeAnalysisTreeNode extends AnalysisTreeNode {
  node: FreeAnalysisTreeNodeData;
  children: FreeAnalysisTreeNode[];
}

export interface FreeAnalysisTree extends AnalysisTree {
  root: FreeAnalysisTreeNode;
}
