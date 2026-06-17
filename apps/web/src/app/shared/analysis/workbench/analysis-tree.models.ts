export interface AnalysisTreeNodeData {
  id: number;
  moveSan: string | null;
  moveUci: string | null;
  isUserMove: boolean;
  moveMeta?: string | null;
}

export interface AnalysisTreeNode {
  node: AnalysisTreeNodeData;
  children: AnalysisTreeNode[];
}

export interface AnalysisTree {
  root: AnalysisTreeNode;
}
