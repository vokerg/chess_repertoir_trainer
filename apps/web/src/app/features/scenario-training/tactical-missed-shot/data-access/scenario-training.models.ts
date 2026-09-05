import type {
  ScenarioAttemptResult,
  ScenarioContextPly,
  ScenarioTrainingAttempt,
  ScenarioTrainingDislikeResponse,
  ScenarioTrainingHistoryResponse,
  ScenarioTrainingSession,
} from '@chess-trainer/contracts/scenario-training';

export type {
  ScenarioAttemptResult,
  ScenarioContextPly,
  ScenarioTrainingAttempt,
  ScenarioTrainingDislikeResponse,
  ScenarioTrainingHistoryResponse,
  ScenarioTrainingSession,
};

export type ScenarioMode = 'intro' | 'context' | 'challenge' | 'result' | 'analysis';
export type ScenarioColor = ScenarioTrainingSession['userColor'];

export interface StartScenarioRequest {
  from?: string;
  to?: string;
  gameId?: number;
  detectionId?: number;
  excludeDetectionId?: number;
  random?: boolean;
  excludePassedRecently?: boolean;
  excludePassedSince?: string;
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
