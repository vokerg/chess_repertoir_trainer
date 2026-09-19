export interface AnalysisTreeNodeData {
  id: number;
  moveSan: string | null;
  moveUci: string | null;
  isUserMove: boolean;
  moveMeta?: string | null;
  moveNumber?: number | null;
  side?: 'WHITE' | 'BLACK' | null;
  classification?: string | null;
  evalCpWhite?: number | null;
}

export interface AnalysisTreeNode {
  node: AnalysisTreeNodeData;
  children: AnalysisTreeNode[];
}

export interface AnalysisTree {
  root: AnalysisTreeNode;
}
