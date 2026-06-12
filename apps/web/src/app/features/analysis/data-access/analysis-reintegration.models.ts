export type RepertoireColor = 'WHITE' | 'BLACK';
export interface AnalysisReintegrationMovePayload { moveUci: string; children: AnalysisReintegrationMovePayload[]; }
export interface AnalysisReintegrationTreePayload { rootFen: string; children: AnalysisReintegrationMovePayload[]; }
export interface AnalysisReintegrationPreviewRequest { analysisTree: AnalysisReintegrationTreePayload; newLineName?: string; newLineSideToTrain?: RepertoireColor; }
export interface AnalysisReintegrationApplyRequest { analysisTree: AnalysisReintegrationTreePayload; target:
  | { kind: 'EXISTING_LINE'; lineId: number; anchor: { kind: 'LINE_START' | 'NODE'; nodeId: number | null; normalizedFen: string }; allowConflicts?: false }
  | { kind: 'NEW_LINE'; name: string; sideToTrain: RepertoireColor; allowConflicts?: false }; }
export interface AnalysisReintegrationLineRef { lineId: number; lineName: string; nodeId: number | null; moveSequenceSan?: string | null; }
export interface AnalysisReintegrationConflict { normalizedFenBefore: string; sideToMove: RepertoireColor; proposedMoveUci: string; proposedMoveSan: string | null; existingMoves: Array<{ moveUci: string; moveSan: string; lineRefs: AnalysisReintegrationLineRef[] }>; }
export interface AnalysisReintegrationCounts { reusedMoves: number; createdMoves: number; conflictingMoves: number; totalAnalysisMoves: number; }
export interface AnalysisReintegrationCandidate { lineId: number; lineName: string; sideToTrain: RepertoireColor; anchor: { kind: 'LINE_START' | 'NODE'; lineId: number; lineName: string; nodeId: number | null; fen: string; normalizedFen: string; moveSequenceSan: string | null }; counts: AnalysisReintegrationCounts; conflicts: AnalysisReintegrationConflict[]; warnings: string[]; }
export interface AnalysisReintegrationPreviewResponse { analysisRootFen: string; analysisRootNormalizedFen: string; candidates: AnalysisReintegrationCandidate[]; newLine: { allowed: boolean; counts: AnalysisReintegrationCounts; conflicts: AnalysisReintegrationConflict[]; warnings: string[] }; }
export interface AnalysisReintegrationApplyResponse { targetKind: 'EXISTING_LINE' | 'NEW_LINE'; lineId: number; lineName: string; createdMoves: number; reusedMoves: number; }
export interface CourseOption { id: number; name: string; description?: string | null; }
export interface ChapterOption { id: number; name: string; description?: string | null; sortOrder: number; }
