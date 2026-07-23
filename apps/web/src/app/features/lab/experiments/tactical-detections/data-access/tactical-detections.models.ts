export type TacticalDetectionKind = 'MISSED_SHOT' | 'PUNISHED_OPPONENT_BLUNDER' | 'USER_BLUNDER';
export type TacticalDetectionKindFilter = 'ALL' | TacticalDetectionKind;

export interface TacticalDetectionRunRequest {
  from?: string;
  to?: string;
  force: boolean;
}

export interface TacticalDetectionRunResponse {
  runId: number;
  scannedGames: number;
  skippedAlreadyProcessedGames: number;
  processedGames: number;
  detectionsInserted: number;
  missedShots: number;
  punishedOpponentBlunders: number;
  userBlunders: number;
}

export interface TacticalDetectionItem {
  id: number;
  kind: TacticalDetectionKind;
  importedGameId: number;
  triggerPlyNumber: number;
  userReplyPlyNumber: number | null;
  moveUci: string;
  bestMoveUci: string | null;
  evalBeforeUserCp: number | null;
  evalAfterTriggerUserCp: number | null;
  evalAfterReplyUserCp: number | null;
  swingCp: number | null;
  opponentUsername: string | null;
  userColor: string | null;
  resultForUser: string | null;
  openingName: string | null;
  openingEco: string | null;
  endedAt: string | null;
  providerUrl: string | null;
}

export interface TacticalDetectionListResponse {
  from: string;
  to: string;
  limit: number;
  kind: TacticalDetectionKind | null;
  items: TacticalDetectionItem[];
}
