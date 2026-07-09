export type ScenarioMode = 'intro' | 'context' | 'challenge' | 'result' | 'analysis';
export type ScenarioColor = 'WHITE' | 'BLACK';

export interface ScenarioContextPly {
  plyNumber: number;
  moveNumber: number;
  moveUci: string;
  moveSan: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
}

export interface ScenarioGameHeader {
  whiteUsername?: string | null;
  blackUsername?: string | null;
  whiteRating?: number | null;
  blackRating?: number | null;
  userColor?: ScenarioColor;
  opponentUsername?: string | null;
  resultForUser?: string | null;
  gameResult?: string | null;
  openingEco?: string | null;
  openingName?: string | null;
  endedAt?: string | null;
  providerUrl?: string | null;
}

export interface ScenarioTrainingAttempt {
  id: number;
  sessionId: number;
  attemptNumber: number;
  fenBefore: string;
  playedMoveUci: string;
  playedMoveSan: string | null;
  fenAfter: string;
  baselineUserEvalCp: number | null;
  afterUserEvalCp: number | null;
  deltaCp: number | null;
  passed: boolean;
  engineSource: string;
  engineName: string | null;
  engineDepth: number;
  engineMultipv: number;
  rawEngineJson?: unknown;
  createdAt: string;
}

export interface ScenarioTrainingSession extends ScenarioGameHeader {
  id: number;
  sessionId: number;
  scenarioType: 'MISSED_OPPORTUNITY' | 'BLUNDER_AVOIDANCE';
  sourceType: 'TACTICAL_DETECTION';
  sourceId: number;
  importedGameId: number;
  previousFen: string | null;
  startFen: string;
  challengePlyNumber: number;
  triggerMoveUci: string | null;
  triggerMoveSan: string | null;
  originalUserMoveUci: string | null;
  originalUserMoveSan: string | null;
  referenceBestMoveUci: string | null;
  contextPlies: ScenarioContextPly[];
  baselineUserEvalCp: number | null;
  passToleranceCp: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  completedAt: string | null;
  attempts: ScenarioTrainingAttempt[];
}

export interface StartScenarioRequest {
  from?: string;
  to?: string;
  detectionId?: number;
  excludeDetectionId?: number;
  random?: boolean;
  excludePassedRecently?: boolean;
}

export interface SubmitScenarioAttemptRequest {
  moveUci: string;
  fenAfter: string;
  engineSource: 'CLIENT_STOCKFISH';
  engineName?: string;
  engineDepth: number;
  engineMultipv: number;
  baselineScoreCpWhite?: number | null;
  baselineMateWhite?: number | null;
  afterScoreCpWhite?: number | null;
  afterMateWhite?: number | null;
  rawEngineJson?: unknown;
}

export interface ScenarioAttemptResult {
  passed: boolean;
  baselineUserEvalCp: number | null;
  afterUserEvalCp: number | null;
  deltaCp: number | null;
  session: ScenarioTrainingSession;
}

export interface ScenarioTrainingHistoryResponse {
  items: ScenarioTrainingSession[];
}
