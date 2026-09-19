import { z } from 'zod';

export const analysisReintegrationLineRefSchema = z.object({
  lineId: z.number().int().positive(),
  lineName: z.string(),
  nodeId: z.number().int().positive().nullable(),
  moveSequenceSan: z.string().nullable().optional(),
});

export const analysisReintegrationConflictSchema = z.object({
  normalizedFenBefore: z.string(),
  sideToMove: z.enum(['WHITE', 'BLACK']),
  proposedMoveUci: z.string(),
  proposedMoveSan: z.string().nullable(),
  existingMoves: z.array(z.object({
    moveUci: z.string(),
    moveSan: z.string(),
    lineRefs: z.array(analysisReintegrationLineRefSchema),
  })),
});

export const analysisReintegrationCountsSchema = z.object({
  reusedMoves: z.number().int().nonnegative(),
  createdMoves: z.number().int().nonnegative(),
  conflictingMoves: z.number().int().nonnegative(),
  totalAnalysisMoves: z.number().int().nonnegative(),
});

interface AnalysisReintegrationPreviewMoveWire {
  moveUci: string;
  moveSan: string | null;
  fenBefore: string;
  fenAfter: string;
  normalizedFenBefore: string;
  status: 'REUSED' | 'CREATES' | 'CONFLICT';
  existingNodeId: number | null;
  reason: string | null;
  children: AnalysisReintegrationPreviewMoveWire[];
}

export const analysisReintegrationPreviewMoveSchema: z.ZodType<AnalysisReintegrationPreviewMoveWire> = z.lazy(() =>
  z.object({
    moveUci: z.string(),
    moveSan: z.string().nullable(),
    fenBefore: z.string(),
    fenAfter: z.string(),
    normalizedFenBefore: z.string(),
    status: z.enum(['REUSED', 'CREATES', 'CONFLICT']),
    existingNodeId: z.number().int().positive().nullable(),
    reason: z.string().nullable(),
    children: z.array(analysisReintegrationPreviewMoveSchema),
  }),
);

export const analysisReintegrationAnchorSchema = z.object({
  kind: z.enum(['LINE_START', 'NODE']),
  lineId: z.number().int().positive(),
  lineName: z.string(),
  nodeId: z.number().int().positive().nullable(),
  fen: z.string(),
  normalizedFen: z.string(),
  moveSequenceSan: z.string().nullable(),
});

export const analysisReintegrationCandidateSchema = z.object({
  lineId: z.number().int().positive(),
  lineName: z.string(),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  anchor: analysisReintegrationAnchorSchema,
  counts: analysisReintegrationCountsSchema,
  conflicts: z.array(analysisReintegrationConflictSchema),
  warnings: z.array(z.string()),
  previewTree: z.array(analysisReintegrationPreviewMoveSchema),
});

export const analysisReintegrationNewLinePreviewSchema = z.object({
  allowed: z.boolean(),
  counts: analysisReintegrationCountsSchema,
  conflicts: z.array(analysisReintegrationConflictSchema),
  warnings: z.array(z.string()),
  previewTree: z.array(analysisReintegrationPreviewMoveSchema),
});

export const analysisReintegrationPreviewResponseSchema = z.object({
  analysisRootFen: z.string(),
  analysisRootNormalizedFen: z.string(),
  candidates: z.array(analysisReintegrationCandidateSchema),
  newLine: analysisReintegrationNewLinePreviewSchema,
});

export const analysisReintegrationApplyResponseSchema = z.object({
  targetKind: z.enum(['EXISTING_LINE', 'NEW_LINE']),
  lineId: z.number().int().positive(),
  lineName: z.string(),
  createdMoves: z.number().int().nonnegative(),
  reusedMoves: z.number().int().nonnegative(),
});

export const analysisReintegrationErrorResponseSchema = z.object({
  error: z.string(),
});

export const analysisReintegrationApplyErrorResponseSchema = z.object({
  error: z.string(),
  conflicts: z.array(analysisReintegrationConflictSchema).optional(),
});

export type AnalysisReintegrationLineRef = z.infer<typeof analysisReintegrationLineRefSchema>;
export type AnalysisReintegrationConflict = z.infer<typeof analysisReintegrationConflictSchema>;
export type AnalysisReintegrationCounts = z.infer<typeof analysisReintegrationCountsSchema>;
export type AnalysisReintegrationPreviewMove = z.infer<typeof analysisReintegrationPreviewMoveSchema>;
export type AnalysisReintegrationAnchor = z.infer<typeof analysisReintegrationAnchorSchema>;
export type AnalysisReintegrationCandidate = z.infer<typeof analysisReintegrationCandidateSchema>;
export type AnalysisReintegrationNewLinePreview = z.infer<typeof analysisReintegrationNewLinePreviewSchema>;
export type AnalysisReintegrationPreviewResponse = z.infer<typeof analysisReintegrationPreviewResponseSchema>;
export type AnalysisReintegrationApplyResponse = z.infer<typeof analysisReintegrationApplyResponseSchema>;
export type AnalysisReintegrationErrorResponse = z.infer<typeof analysisReintegrationErrorResponseSchema>;
export type AnalysisReintegrationApplyErrorResponse = z.infer<typeof analysisReintegrationApplyErrorResponseSchema>;
