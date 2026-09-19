import type {
  OpeningStruggleCourseCoverage as ContractOpeningStruggleCourseCoverage,
  OpeningStruggleCoverageStatus as ContractOpeningStruggleCoverageStatus,
  OpeningStruggleItem as ContractOpeningStruggleItem,
  OpeningStrugglesMode as ContractOpeningStrugglesMode,
  OpeningStrugglesResponse as ContractOpeningStrugglesResponse,
} from '@chess-trainer/contracts/opening-struggles';

export type OpeningStrugglesMode = ContractOpeningStrugglesMode;
export type OpeningStruggleCoverageStatus = ContractOpeningStruggleCoverageStatus;
export type OpeningStruggleCourseCoverage = ContractOpeningStruggleCourseCoverage;
export type OpeningStruggleItem = ContractOpeningStruggleItem;
export type OpeningStrugglesResponse = ContractOpeningStrugglesResponse;

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
