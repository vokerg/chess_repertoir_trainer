import { z } from 'zod';
import {
  candidateDecisionRequestSchema,
  candidateDecisionRoleSchema,
  candidateMoveUciSchema,
  candidateRankingPolicyVersionSchema,
} from '../candidate-decision';
import {
  builderCourseDraftSchema,
  builderCourseReintegrationApplyResponseSchema,
  builderCourseReintegrationTargetSchema,
  type BuilderCourseDraft,
  type BuilderCourseReintegrationApplyResponse,
  type BuilderCourseReintegrationTarget,
} from '../courses';

export const aiCapabilitiesResponseSchema = z.object({
  widgets: z.object({
    gameReview: z.boolean(),
    builderCandidateExplanation: z.boolean(),
    builderCompletionSummary: z.boolean(),
  }),
});

export const aiBuilderCandidateExplanationFactIdSchema = z.string()
  .min(1)
  .max(120)
  .regex(/^(selected|comparison|source)\.[a-z0-9_.-]+$/);

export const aiBuilderCandidateExplanationIdentitySchema = z.object({
  targetId: z.uuid(),
  normalizedFen: z.string().min(1),
  decisionRole: candidateDecisionRoleSchema,
  rankingPolicyVersion: candidateRankingPolicyVersionSchema,
  responseGeneratedAt: z.iso.datetime({ offset: true }),
  selectedMoveUci: candidateMoveUciSchema,
  comparisonMoveUci: candidateMoveUciSchema.nullable(),
});

export const aiBuilderCandidateExplanationRequestSchema = z.object({
  decisionRequest: candidateDecisionRequestSchema,
  identity: aiBuilderCandidateExplanationIdentitySchema,
});

export const aiBuilderCandidateExplanationTradeoffSchema = z.object({
  text: z.string().min(1).max(500),
  evidenceReferenceIds: z.array(aiBuilderCandidateExplanationFactIdSchema).min(1).max(3),
});

export const aiBuilderCandidateExplanationContentSchema = z.object({
  summary: z.string().min(1).max(900),
  tradeoffs: z.array(aiBuilderCandidateExplanationTradeoffSchema).max(3),
  evidenceReferenceIds: z.array(aiBuilderCandidateExplanationFactIdSchema).min(1).max(3),
  missingEvidenceReferenceId: aiBuilderCandidateExplanationFactIdSchema.nullable(),
});

export const aiBuilderCandidateExplanationFactSchema = z.object({
  id: aiBuilderCandidateExplanationFactIdSchema,
  label: z.string().min(1).max(160),
  value: z.string().min(1).max(500),
  missing: z.boolean(),
});

export const aiBuilderCandidateExplanationCandidateSchema = z.object({
  moveUci: candidateMoveUciSchema,
  moveSan: z.string().min(1),
  rank: z.number().int().positive(),
});

export const aiBuilderCandidateExplanationResponseSchema = z.object({
  kind: z.literal('BUILDER_CANDIDATE_EXPLANATION'),
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime({ offset: true }),
  identity: aiBuilderCandidateExplanationIdentitySchema,
  selectedCandidate: aiBuilderCandidateExplanationCandidateSchema,
  comparisonCandidate: aiBuilderCandidateExplanationCandidateSchema.nullable(),
  explanation: aiBuilderCandidateExplanationContentSchema,
  referencedFacts: z.array(aiBuilderCandidateExplanationFactSchema).max(16),
  disclaimer: z.literal('Candidate ranking remains deterministic and move choice remains yours.'),
});

export const aiBuilderCompletionSummaryFactIdSchema = z.string()
  .min(1)
  .max(180)
  .regex(/^(result|draft|path|excluded)\.[a-z0-9_.:-]+$/);

export const aiBuilderCompletionSummaryDestinationSchema = z.object({
  courseId: z.number().int().positive(),
  courseName: z.string().min(1).max(200),
  chapterId: z.number().int().positive(),
  chapterName: z.string().min(1).max(200),
});

export const aiBuilderCompletionSummaryIdentitySchema = z.object({
  sessionId: z.string().min(1),
  sessionRevision: z.number().int().nonnegative(),
  targetId: z.string().min(1),
  courseId: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  lineId: z.number().int().positive(),
  courseContentRevision: z.number().int().positive(),
});

export interface AiBuilderCompletionSummaryRequest {
  draft: BuilderCourseDraft;
  destination: {
    courseId: number;
    courseName: string;
    chapterId: number;
    chapterName: string;
  };
  selectedTarget: BuilderCourseReintegrationTarget;
  applyResult: BuilderCourseReintegrationApplyResponse;
}

export const aiBuilderCompletionSummaryRequestSchema: z.ZodType<AiBuilderCompletionSummaryRequest> = z.object({
  draft: builderCourseDraftSchema,
  destination: aiBuilderCompletionSummaryDestinationSchema,
  selectedTarget: builderCourseReintegrationTargetSchema,
  applyResult: builderCourseReintegrationApplyResponseSchema,
}) as z.ZodType<AiBuilderCompletionSummaryRequest>;

export const aiBuilderCompletionSummaryReferencedTextSchema = z.object({
  text: z.string().min(1).max(500),
  evidenceReferenceIds: z.array(aiBuilderCompletionSummaryFactIdSchema).min(1).max(3),
});

export const aiBuilderCompletionSummaryContentSchema = z.object({
  interpretation: z.string().min(1).max(1000),
  interpretationReferenceIds: z.array(aiBuilderCompletionSummaryFactIdSchema).min(1).max(4),
  highlights: z.array(aiBuilderCompletionSummaryReferencedTextSchema).max(3),
  studyChecklist: z.array(aiBuilderCompletionSummaryReferencedTextSchema).max(3),
  unresolvedWorkNote: aiBuilderCompletionSummaryReferencedTextSchema.nullable(),
  warning: aiBuilderCompletionSummaryReferencedTextSchema.nullable(),
});

export const aiBuilderCompletionSummaryFactSchema = z.object({
  id: aiBuilderCompletionSummaryFactIdSchema,
  label: z.string().min(1).max(160),
  value: z.string().min(1).max(700),
});

export const aiBuilderCompletionSummaryAuthoritativeResultSchema = z.object({
  courseId: z.number().int().positive(),
  courseName: z.string().min(1),
  chapterId: z.number().int().positive(),
  chapterName: z.string().min(1),
  lineId: z.number().int().positive(),
  lineName: z.string().min(1),
  targetKind: z.enum(['EXISTING_LINE', 'NEW_LINE']),
  createdMoves: z.number().int().nonnegative(),
  reusedMoves: z.number().int().nonnegative(),
  skippedBranches: z.number().int().nonnegative(),
  totalDraftMoves: z.number().int().positive(),
  courseContentRevision: z.number().int().positive(),
  idempotent: z.boolean(),
  factualSummary: z.string().min(1).max(700),
});

export const aiBuilderCompletionSummaryResponseSchema = z.object({
  kind: z.literal('BUILDER_COMPLETION_SUMMARY'),
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime({ offset: true }),
  identity: aiBuilderCompletionSummaryIdentitySchema,
  authoritativeResult: aiBuilderCompletionSummaryAuthoritativeResultSchema,
  interpretation: aiBuilderCompletionSummaryContentSchema,
  referencedFacts: z.array(aiBuilderCompletionSummaryFactSchema).max(24),
  disclaimer: z.literal('Course changes are authoritative; generated study suggestions are optional.'),
});

export const aiGameReviewWarningSchema = z.enum([
  'INCOMPLETE_MOVE_DATA',
  'LIMITED_ENGINE_DATA',
  'OPENING_NOT_IDENTIFIED',
]);

export const aiGameReviewTurningPointSchema = z.object({
  plyNumber: z.number().int().positive(),
  moveNumber: z.number().int().positive(),
  side: z.enum(['WHITE', 'BLACK']),
  playedMoveSan: z.string().nullable(),
  bestMoveSan: z.string().nullable(),
  classification: z.string().nullable(),
  scoreLossCp: z.number().nullable(),
  explanation: z.string().min(1).max(700),
});

export const aiGameReviewResponseSchema = z.object({
  kind: z.literal('GAME_REVIEW'),
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime({ offset: true }),
  review: z.object({
    headline: z.string().min(1).max(160),
    overview: z.string().min(1).max(1500),
    openingAssessment: z.string().min(1).max(800),
    turningPoints: z.array(aiGameReviewTurningPointSchema).max(6),
    strengths: z.array(z.string().min(1).max(300)).max(4),
    improvements: z.array(z.string().min(1).max(300)).max(4),
    practicePriorities: z.array(z.string().min(1).max(300)).max(3),
    themes: z.array(z.string().min(1).max(80)).max(6),
  }),
  warnings: z.array(aiGameReviewWarningSchema),
});

export const aiGameReviewStateResponseSchema = z.object({
  review: aiGameReviewResponseSchema.nullable(),
});

export const aiErrorResponseSchema = z.object({
  code: z.string().min(1),
  error: z.string().min(1),
});

export type AiCapabilitiesResponse = z.output<typeof aiCapabilitiesResponseSchema>;
export type AiBuilderCandidateExplanationIdentity = z.output<typeof aiBuilderCandidateExplanationIdentitySchema>;
export type AiBuilderCandidateExplanationRequest = z.output<typeof aiBuilderCandidateExplanationRequestSchema>;
export type AiBuilderCandidateExplanationContent = z.output<typeof aiBuilderCandidateExplanationContentSchema>;
export type AiBuilderCandidateExplanationFact = z.output<typeof aiBuilderCandidateExplanationFactSchema>;
export type AiBuilderCandidateExplanationResponse = z.output<typeof aiBuilderCandidateExplanationResponseSchema>;
export type AiBuilderCompletionSummaryDestination = z.output<typeof aiBuilderCompletionSummaryDestinationSchema>;
export type AiBuilderCompletionSummaryIdentity = z.output<typeof aiBuilderCompletionSummaryIdentitySchema>;
export type AiBuilderCompletionSummaryContent = z.output<typeof aiBuilderCompletionSummaryContentSchema>;
export type AiBuilderCompletionSummaryFact = z.output<typeof aiBuilderCompletionSummaryFactSchema>;
export type AiBuilderCompletionSummaryAuthoritativeResult = z.output<typeof aiBuilderCompletionSummaryAuthoritativeResultSchema>;
export type AiBuilderCompletionSummaryResponse = z.output<typeof aiBuilderCompletionSummaryResponseSchema>;
export type AiGameReviewResponse = z.output<typeof aiGameReviewResponseSchema>;
export type AiGameReviewStateResponse = z.output<typeof aiGameReviewStateResponseSchema>;
export type AiGameReviewTurningPoint = z.output<typeof aiGameReviewTurningPointSchema>;
export type AiGameReviewWarning = z.output<typeof aiGameReviewWarningSchema>;