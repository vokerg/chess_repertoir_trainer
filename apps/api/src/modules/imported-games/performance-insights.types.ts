export interface GamePerformanceWdl {
  total: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number | null;
}

export interface GamePerformanceTagStat {
  code: number;
  name: string;
  games: number;
  ratePct: number;
  wdl: GamePerformanceWdl;
}

export interface GamePerformanceBucket {
  key: string;
  label: string;
  games: number;
  ratePct: number;
  tags: GamePerformanceTagStat[];
}

export interface GamePerformanceSummary {
  sample: {
    games: number;
    taggedGames: number;
  };
  wdl: GamePerformanceWdl;
  tags: GamePerformanceTagStat[];
  buckets: GamePerformanceBucket[];
}

export interface GamePerformanceInputGame {
  id: number;
  resultForUser: string | null;
  tagCodes: readonly number[] | null;
}
