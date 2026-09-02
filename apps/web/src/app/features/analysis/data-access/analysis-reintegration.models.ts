export type {
  AnalysisReintegrationApplyResponse,
  AnalysisReintegrationCandidate,
  AnalysisReintegrationConflict,
  AnalysisReintegrationCounts,
  AnalysisReintegrationPreviewResponse,
} from '@chess-trainer/contracts/courses';

export type RepertoireColor = 'WHITE' | 'BLACK';
export interface AnalysisReintegrationMovePayload { moveUci: string; children: AnalysisReintegrationMovePayload[]; }
export interface AnalysisReintegrationTreePayload { rootFen: string; children: AnalysisReintegrationMovePayload[]; }
export interface AnalysisReintegrationPreviewRequest { analysisTree: AnalysisReintegrationTreePayload; newLineName?: string; newLineSideToTrain?: RepertoireColor; }
export interface AnalysisReintegrationApplyRequest { analysisTree: AnalysisReintegrationTreePayload; target:
  | { kind: 'EXISTING_LINE'; lineId: number; anchor: { kind: 'LINE_START' | 'NODE'; nodeId: number | null; normalizedFen: string }; allowConflicts?: false }
  | { kind: 'NEW_LINE'; name: string; sideToTrain: RepertoireColor; allowConflicts?: boolean }; }
export interface CourseOption { id: number; name: string; description?: string | null; }
export interface ChapterOption { id: number; name: string; description?: string | null; sortOrder: number; }
