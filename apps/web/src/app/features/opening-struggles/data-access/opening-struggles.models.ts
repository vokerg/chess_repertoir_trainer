export type OpeningStrugglesMode = 'results' | 'moveQuality';

export interface OpeningStrugglesCriteria {
  mode: OpeningStrugglesMode;
  minGames: number;
  minLossRate: number;
  minAnalysedGames: number;
  minAverageCentipawnLoss: number;
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
}

export interface OpeningStrugglesResponse {
  totalFilteredGames: number;
  indexedFilteredGames: number;
  maxPly: number;
  limit: number;
  mode: OpeningStrugglesMode;
  items: OpeningStruggleItem[];
}
