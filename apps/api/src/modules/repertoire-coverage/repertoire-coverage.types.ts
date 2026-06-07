export type RepertoireColor = 'WHITE' | 'BLACK';

export type LineCoverageStatus =
  | 'MATCHED_LINE'
  | 'USER_DEVIATION'
  | 'OPPONENT_UNCOVERED'
  | 'LINE_ENDED'
  | 'NOT_REACHED'
  | 'UNINDEXED_GAME';

export interface CoverageLineNode {
  id: number;
  parentId: number | null;
  moveUci: string;
  moveSan: string;
  isUserMove: boolean;
  isCorrectUserMove: boolean;
}

export interface CoveragePly {
  plyNumber: number;
  moveUci: string;
  normalizedFenBefore: string;
}

export interface CoverageGameMetadata {
  gameId: number;
  provider: string;
  providerGameId: string | null;
  providerUrl: string | null;
  endedAt: Date | null;
  importedAt: Date | null;
  userColor: RepertoireColor | null;
  opponentUsername: string | null;
  resultForUser: 'WIN' | 'DRAW' | 'LOSS' | null;
}

export interface LineCoverageGame {
  gameId: number;
  provider: string;
  providerGameId: string | null;
  providerUrl: string | null;
  endedAt: string | null;
  importedAt: string | null;
  userColor: RepertoireColor | null;
  opponentUsername: string | null;
  resultForUser: 'WIN' | 'DRAW' | 'LOSS' | null;
  status: LineCoverageStatus;
  plyNumber: number | null;
  fenBefore: string | null;
  normalizedFenBefore: string | null;
  sideToMove: RepertoireColor | null;
  expectedMoveUci: string | null;
  expectedMoveUcis: string[];
  expectedMoveSans: string[];
  playedMoveUci: string | null;
  playedSan: string | null;
  matchedLineNodeId: number | null;
  parentLineNodeId: number | null;
}
