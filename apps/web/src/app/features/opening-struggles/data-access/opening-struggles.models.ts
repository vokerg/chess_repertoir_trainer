export type OpeningStrugglesMode = 'results' | 'repeatedMistakes' | 'badPositions';

export interface OpeningStrugglesCriteria {
  mode: OpeningStrugglesMode;
  minGames: number;
  minLossRate: number;
  minOccurrences: number;
  minAverageCentipawnLoss: number;
  minEvaluatedGames: number;
  maxAverageUserEvalCp: number;
  openingDepth: number;
  limit: number;
}

export interface OpeningStruggleItem {
  key: string;
  parentKey: string | null;
  userColor: 'WHITE' | 'BLACK';
  movesUci: string[];
  movesSan?: string[];
  ply: number;
  analysisGameId: number | null;
  totalReachGames: number;
  metricGames: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number | null;
  lossRate: number | null;
  scorePct: number | null;
  analysedMoveCount: number;
  averageCentipawnLoss: number | null;
  evalGames: number;
  avgUserEvalCp: number | null;
  bestUserEvalCp: number | null;
  worstUserEvalCp: number | null;
  afterPositionAnalysisId: number | null;
  afterPositionNormalizedFen: string | null;
  afterPositionBestScoreCpWhite: number | null;
  afterPositionBestMateWhite: number | null;
  courseCoverage: OpeningStruggleCourseCoverage;
}

export type OpeningStruggleCoverageStatus =
  | 'COVERED'
  | 'MY_DEVIATION'
  | 'OPPONENT_UNCOVERED'
  | 'REPERTOIRE_ENDED'
  | 'NOT_COVERED';

export interface OpeningStruggleCourseCoverage {
  status: OpeningStruggleCoverageStatus;
  coveredPlies: number;
  deviationPly: number | null;
  courses: Array<{ id: number; name: string }>;
  expectedMoveSans: string[];
}

export interface OpeningStrugglesResponse {
  totalFilteredGames: number;
  indexedFilteredGames: number;
  maxPly: number;
  limit: number;
  mode: OpeningStrugglesMode;
  items: OpeningStruggleItem[];
}
