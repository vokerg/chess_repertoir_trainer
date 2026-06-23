import { ImportedGameAnalysisMove, UserColor } from '../data-access/games.models';

export interface PlayedGameMove {
  plyNumber: number;
  moveNumber: number;
  side: UserColor;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

export interface GameTreeNodeData {
  id: number;
  plyNumber: number | null;
  moveNumber: number | null;
  side: UserColor | null;
  moveSan: string | null;
  moveUci: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
  source: 'GAME' | 'LOCAL';
  analysisMove: ImportedGameAnalysisMove | null;
}

export interface GameTreeNode {
  node: GameTreeNodeData;
  children: GameTreeNode[];
}

export interface GameTree {
  root: GameTreeNode;
}

export interface BoardLastMove {
  from: string;
  to: string;
}

export interface BoardArrow {
  from: string;
  to: string;
  brush?: string;
}
