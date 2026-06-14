export type OpeningStrugglesResultMetric = 'none' | 'lossRate' | 'winRate' | 'scorePct';
export type OpeningStrugglesEvalMetric = 'none' | 'userEvalCp';
export interface OpeningStrugglesCriteria {
  minGames: number;
  maxPly: number;
  limit: number;
  resultMetric: OpeningStrugglesResultMetric;
  minLossRate: number;
  maxWinRate: number;
  maxScorePct: number;
  evalMetric: OpeningStrugglesEvalMetric;
  maxUserEvalCp: number;
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
  evalGames: number;
  evalBadGames: number;
  avgUserEvalCp: number | null;
  bestUserEvalCp: number | null;
  worstUserEvalCp: number | null;
  afterPositionAnalysisId: number | null;
  afterPositionNormalizedFen: string | null;
  afterPositionBestScoreCpWhite: number | null;
  afterPositionBestMateWhite: number | null;
}

export interface OpeningStrugglesResponse {
  totalFilteredGames: number;
  indexedFilteredGames: number;
  minGames: number;
  maxPly: number;
  limit: number;
  resultMetric: OpeningStrugglesResultMetric;
  evalMetric: OpeningStrugglesEvalMetric;
  items: OpeningStruggleItem[];
}
