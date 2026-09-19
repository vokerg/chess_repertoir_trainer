import { z } from 'zod';
import { repertoireTargetSchema } from '../repertoire-target';

export const BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION = '2026-07-v1' as const;
export const builderCourseReintegrationContractVersionSchema = z.literal(
  BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
);

interface CourseDraftMoveInput {
  moveUci: string;
  children?: CourseDraftMoveInput[];
}
interface CourseDraftMoveOutput {
  moveUci: string;
  children: CourseDraftMoveOutput[];
}

export const builderCourseDraftMoveSchema: z.ZodType<
  CourseDraftMoveOutput,
  CourseDraftMoveInput
> = z.lazy(() => z.object({
  moveUci: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
  children: z.array(builderCourseDraftMoveSchema).default([]),
}));

export const builderCourseDraftTreeSchema = z.object({
  rootFen: z.string().trim().min(1),
  children: z.array(builderCourseDraftMoveSchema).min(1),
});

export const builderCourseExcludedBranchSchema = z.object({
  branchId: z.string().trim().min(1),
  pathUci: z.array(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)),
  status: z.enum(['PENDING', 'ACCEPTED', 'DEFERRED', 'IGNORED', 'COMPLETED', 'STALE']),
  reason: z.enum(['PENDING', 'DEFERRED', 'IGNORED', 'STALE', 'ANCESTOR_EXCLUDED']),
});

export const builderCourseDraftSchema = z.object({
  draftVersion: z.literal('2026-07-v1'),
  sessionModelVersion: z.literal('2026-07-v1'),
  sessionId: z.string().trim().min(1),
  ownerId: z.string().trim().min(1),
  sessionRevision: z.number().int().nonnegative(),
  sessionLifecycle: z.literal('COMPLETED'),
  targetRevision: z.number().int().positive(),
  targetContractVersion: z.string().trim().min(1),
  targetId: z.string().trim().min(1),
  targetCapturedAt: z.iso.datetime({ offset: true }),
  target: repertoireTargetSchema,
  repertoireSide: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().trim().min(1),
  analysisTree: builderCourseDraftTreeSchema,
  materializedDecisionCount: z.number().int().positive(),
  materializedMoveCount: z.number().int().positive(),
  transpositionLeafCount: z.number().int().nonnegative(),
  excludedBranches: z.array(builderCourseExcludedBranchSchema).max(256),
}).superRefine((draft, context) => {
  if (draft.target.contractVersion !== draft.targetContractVersion) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetContractVersion'],
      message: 'targetContractVersion must match target.contractVersion',
    });
  }
  if (draft.target.targetId !== draft.targetId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetId'],
      message: 'targetId must match target.targetId',
    });
  }
  if (draft.target.side !== draft.repertoireSide) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repertoireSide'],
      message: 'repertoireSide must match target.side',
    });
  }
  if (draft.analysisTree.rootFen !== draft.startingFen) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['analysisTree', 'rootFen'],
      message: 'analysisTree.rootFen must match startingFen',
    });
  }
  if (countDraftMoves(draft.analysisTree.children) !== draft.materializedMoveCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['materializedMoveCount'],
      message: 'materializedMoveCount must match the analysis tree',
    });
  }
  const excludedIds = draft.excludedBranches.map((branch) => branch.branchId);
  if (new Set(excludedIds).size !== excludedIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['excludedBranches'],
      message: 'excludedBranches must have unique branchId values',
    });
  }
});

export const builderCourseReintegrationCountsSchema = z.object({
  reusedMoves: z.number().int().nonnegative(),
  createdMoves: z.number().int().nonnegative(),
  conflictingMoves: z.number().int().nonnegative(),
  totalDraftMoves: z.number().int().positive(),
  skippedBranches: z.number().int().nonnegative(),
});

export const builderCourseLineReferenceSchema = z.object({
  lineId: z.number().int().positive(),
  lineName: z.string(),
  nodeId: z.number().int().positive().nullable(),
  moveSequenceSan: z.string().nullable().optional(),
});

export const builderCourseConflictSchema = z.object({
  normalizedFenBefore: z.string().min(1),
  sideToMove: z.enum(['WHITE', 'BLACK']),
  proposedMoveUci: z.string(),
  proposedMoveSan: z.string().nullable(),
  existingMoves: z.array(z.object({
    moveUci: z.string(),
    moveSan: z.string(),
    lineRefs: z.array(builderCourseLineReferenceSchema),
  })),
});

interface CoursePreviewMoveInput {
  moveUci: string;
  moveSan?: string | null;
  fenBefore: string;
  fenAfter: string;
  normalizedFenBefore: string;
  status: 'REUSED' | 'CREATES' | 'CONFLICT';
  existingNodeId?: number | null;
  reason?: string | null;
  children?: CoursePreviewMoveInput[];
}
interface CoursePreviewMoveOutput {
  moveUci: string;
  moveSan: string | null;
  fenBefore: string;
  fenAfter: string;
  normalizedFenBefore: string;
  status: 'REUSED' | 'CREATES' | 'CONFLICT';
  existingNodeId: number | null;
  reason: string | null;
  children: CoursePreviewMoveOutput[];
}

export const builderCoursePreviewMoveSchema: z.ZodType<
  CoursePreviewMoveOutput,
  CoursePreviewMoveInput
> = z.lazy(() => z.object({
  moveUci: z.string(),
  moveSan: z.string().nullable().default(null),
  fenBefore: z.string(),
  fenAfter: z.string(),
  normalizedFenBefore: z.string(),
  status: z.enum(['REUSED', 'CREATES', 'CONFLICT']),
  existingNodeId: z.number().int().positive().nullable().default(null),
  reason: z.string().nullable().default(null),
  children: z.array(builderCoursePreviewMoveSchema).default([]),
}));

export const builderCourseAnchorSchema = z.object({
  kind: z.enum(['LINE_START', 'NODE']),
  lineId: z.number().int().positive(),
  lineName: z.string(),
  nodeId: z.number().int().positive().nullable(),
  fen: z.string(),
  normalizedFen: z.string(),
  moveSequenceSan: z.string().nullable(),
});

export const builderCourseMergeCandidateSchema = z.object({
  lineId: z.number().int().positive(),
  lineName: z.string(),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  anchor: builderCourseAnchorSchema,
  counts: builderCourseReintegrationCountsSchema,
  conflicts: z.array(builderCourseConflictSchema),
  warnings: z.array(z.string()),
  previewTree: z.array(builderCoursePreviewMoveSchema),
});

export const builderCourseDraftSummarySchema = z.object({
  sessionId: z.string(),
  sessionRevision: z.number().int().nonnegative(),
  targetId: z.string(),
  targetRevision: z.number().int().positive(),
  repertoireSide: z.enum(['WHITE', 'BLACK']),
  materializedDecisionCount: z.number().int().positive(),
  materializedMoveCount: z.number().int().positive(),
  transpositionLeafCount: z.number().int().nonnegative(),
  excludedBranches: z.array(builderCourseExcludedBranchSchema),
});

export const builderCourseNewLinePreviewSchema = z.object({
  status: z.enum(['CREATES', 'REUSES_EXISTING_LINE', 'CONFLICT']),
  allowed: z.boolean(),
  equivalentLine: z.object({
    lineId: z.number().int().positive(),
    lineName: z.string(),
  }).nullable(),
  counts: builderCourseReintegrationCountsSchema,
  conflicts: z.array(builderCourseConflictSchema),
  warnings: z.array(z.string()),
  previewTree: z.array(builderCoursePreviewMoveSchema),
});

export const builderCourseReintegrationPreviewRequestSchema = z.object({
  contractVersion: builderCourseReintegrationContractVersionSchema.default(
    BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
  ),
  draft: builderCourseDraftSchema,
  newLineName: z.string().trim().min(1).max(200),
});

export const builderCourseReintegrationPreviewResponseSchema = z.object({
  contractVersion: builderCourseReintegrationContractVersionSchema,
  previewToken: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  previewedAt: z.iso.datetime({ offset: true }),
  course: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    contentRevision: z.number().int().positive(),
  }),
  chapter: z.object({
    id: z.number().int().positive(),
    name: z.string(),
  }),
  draft: builderCourseDraftSummarySchema,
  candidates: z.array(builderCourseMergeCandidateSchema),
  newLine: builderCourseNewLinePreviewSchema,
});

export const builderCourseReintegrationTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('EXISTING_LINE'),
    lineId: z.number().int().positive(),
    anchor: z.object({
      kind: z.enum(['LINE_START', 'NODE']),
      nodeId: z.number().int().positive().nullable(),
      normalizedFen: z.string().min(1),
    }),
  }),
  z.object({
    kind: z.literal('NEW_LINE'),
    name: z.string().trim().min(1).max(200),
  }),
]);

export const builderCourseReintegrationApplyRequestSchema = z.object({
  contractVersion: builderCourseReintegrationContractVersionSchema.default(
    BUILDER_COURSE_REINTEGRATION_CONTRACT_VERSION,
  ),
  draft: builderCourseDraftSchema,
  newLineName: z.string().trim().min(1).max(200),
  previewToken: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  target: builderCourseReintegrationTargetSchema,
});

export const builderCourseReintegrationApplyResponseSchema = z.object({
  contractVersion: builderCourseReintegrationContractVersionSchema,
  targetKind: z.enum(['EXISTING_LINE', 'NEW_LINE']),
  courseId: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  lineId: z.number().int().positive(),
  lineName: z.string(),
  createdMoves: z.number().int().nonnegative(),
  reusedMoves: z.number().int().nonnegative(),
  skippedBranches: z.number().int().nonnegative(),
  conflictingMoves: z.literal(0),
  totalDraftMoves: z.number().int().positive(),
  courseContentRevision: z.number().int().positive(),
  idempotent: z.boolean(),
});

export type BuilderCourseDraft = z.infer<typeof builderCourseDraftSchema>;
export type BuilderCourseReintegrationPreviewRequest = z.infer<
  typeof builderCourseReintegrationPreviewRequestSchema
>;
export type BuilderCourseReintegrationPreviewResponse = z.infer<
  typeof builderCourseReintegrationPreviewResponseSchema
>;
export type BuilderCourseReintegrationTarget = z.infer<
  typeof builderCourseReintegrationTargetSchema
>;
export type BuilderCourseReintegrationApplyRequest = z.infer<
  typeof builderCourseReintegrationApplyRequestSchema
>;
export type BuilderCourseReintegrationApplyResponse = z.infer<
  typeof builderCourseReintegrationApplyResponseSchema
>;

function countDraftMoves(moves: CourseDraftMoveOutput[]): number {
  return moves.reduce((total, move) => total + 1 + countDraftMoves(move.children), 0);
}
