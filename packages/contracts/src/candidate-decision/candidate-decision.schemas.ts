import { z } from 'zod';
import {
  playerChessProfileDimensionSchema,
  playerChessProfileEvidenceStrengthSchema,
  playerChessProfileOpeningCharacterSchema,
  playerChessProfileOpeningConfidenceSchema,
  playerChessProfileOpeningRoleSchema,
  playerChessProfileOpeningSoundnessSchema,
  playerChessProfileOpeningTheoreticalStatusSchema,
  playerChessProfileOpeningTheoryBurdenSchema,
} from '../player-chess-profile';
import { repertoireTargetSchema } from '../repertoire-target';

export const CANDIDATE_DECISION_CONTRACT_VERSION = '2026-08-v3' as const;
export const CANDIDATE_RANKING_POLICY_VERSION = '2026-08-empirical-persona-v2' as const;

export const candidateDecisionContractVersionSchema = z.literal(CANDIDATE_DECISION_CONTRACT_VERSION);
export const candidateRankingPolicyVersionSchema = z.literal(CANDIDATE_RANKING_POLICY_VERSION);

export const candidateMoveUciSchema = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/i);

export const candidateDecisionRoleSchema = z.enum(['USER_MOVE', 'OPPONENT_RESPONSE']);
export type CandidateDecisionRole = z.infer<typeof candidateDecisionRoleSchema>;

export const candidateEvidenceStatusSchema = z.enum([
  'AVAILABLE',
  'STALE',
  'INSUFFICIENT',
  'UNAVAILABLE',
]);
export type CandidateEvidenceStatus = z.infer<typeof candidateEvidenceStatusSchema>;

export const candidateFitStatusSchema = z.enum(['ALIGNED', 'NEUTRAL', 'CONFLICT', 'UNKNOWN']);
export type CandidateFitStatus = z.infer<typeof candidateFitStatusSchema>;

export const candidateEligibilityStatusSchema = z.enum(['ELIGIBLE', 'WARNING', 'EXCLUDED']);
export type CandidateEligibilityStatus = z.infer<typeof candidateEligibilityStatusSchema>;

export const candidateReasonCodeSchema = z.enum([
  'ENGINE_BEST',
  'ENGINE_CLOSE',
  'OBJECTIVE_COST',
  'POPULATION_COMMON',
  'POPULATION_STRONG_SCORE',
  'MASTER_SUPPORTED',
  'PERSONALLY_FAMILIAR',
  'PERSONAL_RESULTS_POSITIVE',
  'TARGET_CHARACTER_MATCH',
  'TARGET_THEORY_MATCH',
  'TARGET_SOUNDNESS_CONFLICT',
  'TARGET_THEORY_EXCEEDED',
  'PROFILE_PREFERENCE_MATCH',
  'PROFILE_PERFORMANCE_SUPPORT',
  'PROFILE_PERFORMANCE_WARNING',
  'COURSE_ALREADY_COVERS',
  'COURSE_CONFLICT',
  'TRANSPOSES_TO_COVERAGE',
  'COMMON_AT_TARGET_LEVEL',
  'PERSONALLY_ENCOUNTERED',
  'DANGEROUS_RESPONSE',
  'LOW_EVIDENCE',
  'MANUAL_CANDIDATE',
]);
export type CandidateReasonCode = z.infer<typeof candidateReasonCodeSchema>;

export const candidateWarningCodeSchema = z.enum([
  'FORCED_MATE_AGAINST_TARGET',
  'OBJECTIVE_LOSS',
  'OBJECTIVE_EVIDENCE_MISSING',
  'LOW_ENGINE_DEPTH',
  'TARGET_SOUNDNESS_MISMATCH',
  'THEORY_BUDGET_EXCEEDED',
  'SPARSE_PERSONAL_EVIDENCE',
  'COURSE_CONFLICT',
  'SOURCE_UNAVAILABLE',
]);
export type CandidateWarningCode = z.infer<typeof candidateWarningCodeSchema>;

export const candidateDecisionRequestSchema = z.object({
  fen: z.string().trim().min(1).default('startpos'),
  decisionRole: candidateDecisionRoleSchema,
  target: repertoireTargetSchema,
  includeMoveUci: candidateMoveUciSchema.optional(),
  candidateLimit: z.number().int().min(1).max(8).default(6),
});
export type CandidateDecisionRequest = z.infer<typeof candidateDecisionRequestSchema>;

export const candidateEngineEvidenceSchema = z.object({
  status: candidateEvidenceStatusSchema,
  depth: z.number().int().nonnegative().nullable(),
  multipv: z.number().int().positive().nullable(),
  scoreCpForTarget: z.number().int().nullable(),
  mateForTarget: z.number().int().nullable(),
  objectiveDeltaCp: z.number().int().nonnegative().nullable(),
  pvUci: z.array(candidateMoveUciSchema).max(8),
});
export type CandidateEngineEvidence = z.infer<typeof candidateEngineEvidenceSchema>;

export const candidateCorpusEvidenceSchema = z.object({
  status: candidateEvidenceStatusSchema,
  games: z.number().int().nonnegative(),
  frequencyPercent: z.number().min(0).max(100).nullable(),
  scorePercentForTarget: z.number().min(0).max(100).nullable(),
  positionBaselineScorePercentForTarget: z.number().min(0).max(100).nullable(),
  scoreDeltaVsPositionPercent: z.number().min(-100).max(100).nullable(),
  averageRating: z.number().int().nonnegative().nullable(),
  datasetVersion: z.string().min(1).nullable(),
  fetchedAt: z.iso.datetime({ offset: true }).nullable(),
  representativeGameId: z.string().min(1).nullable(),
});
export type CandidateCorpusEvidence = z.infer<typeof candidateCorpusEvidenceSchema>;

export const candidatePersonalEvidenceSchema = z.object({
  status: candidateEvidenceStatusSchema,
  occurrences: z.number().int().nonnegative(),
  games: z.number().int().nonnegative(),
  scorePercent: z.number().min(0).max(100).nullable(),
});
export type CandidatePersonalEvidence = z.infer<typeof candidatePersonalEvidenceSchema>;

export const candidateOpeningKnowledgeStatusSchema = z.enum([
  'AVAILABLE',
  'PARTIAL',
  'UNAVAILABLE',
]);
export type CandidateOpeningKnowledgeStatus = z.infer<typeof candidateOpeningKnowledgeStatusSchema>;

export const candidateOpeningKnowledgeStatementSchema = z.object({
  text: z.string().trim().min(1),
  confidence: playerChessProfileOpeningConfidenceSchema,
});
export type CandidateOpeningKnowledgeStatement = z.infer<typeof candidateOpeningKnowledgeStatementSchema>;

export const candidateOpeningKnowledgePlanSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  conditions: z.array(z.string().trim().min(1)).max(4),
  caveats: z.array(z.string().trim().min(1)).max(4),
  confidence: playerChessProfileOpeningConfidenceSchema,
});
export type CandidateOpeningKnowledgePlan = z.infer<typeof candidateOpeningKnowledgePlanSchema>;

export const candidateOpeningKnowledgeEvidenceSchema = z.object({
  status: candidateOpeningKnowledgeStatusSchema,
  version: z.string().trim().min(1).nullable(),
  shortDescription: candidateOpeningKnowledgeStatementSchema.nullable(),
  strategicSummary: candidateOpeningKnowledgeStatementSchema.nullable(),
  plans: z.array(candidateOpeningKnowledgePlanSchema).max(3),
  matchedRuleIds: z.array(z.string().trim().min(1)).max(12),
  sourceIds: z.array(z.string().trim().min(1)).max(12),
}).superRefine((knowledge, context) => {
  const hasContent = Boolean(
    knowledge.shortDescription
    || knowledge.strategicSummary
    || knowledge.plans.length,
  );

  if (knowledge.status === 'UNAVAILABLE') {
    if (hasContent || knowledge.matchedRuleIds.length || knowledge.sourceIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unavailable opening knowledge must not contain reviewed content or provenance.',
      });
    }
    return;
  }

  if (!knowledge.version) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['version'],
      message: 'Available or partial opening knowledge requires a version.',
    });
  }
  if (!hasContent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'Available or partial opening knowledge requires reviewed content.',
    });
  }
  if (!knowledge.matchedRuleIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['matchedRuleIds'],
      message: 'Available or partial opening knowledge requires a matched rule.',
    });
  }
  if (!knowledge.sourceIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sourceIds'],
      message: 'Available or partial opening knowledge requires provenance.',
    });
  }
});
export type CandidateOpeningKnowledgeEvidence = z.infer<typeof candidateOpeningKnowledgeEvidenceSchema>;

export const candidateOpeningEvidenceSchema = z.object({
  status: candidateEvidenceStatusSchema,
  opening: z.object({
    eco: z.string().min(1).nullable(),
    name: z.string().min(1),
  }).nullable(),
  classificationVersion: z.string().min(1).nullable(),
  side: z.enum(['WHITE', 'BLACK']),
  soundness: playerChessProfileOpeningSoundnessSchema.nullable(),
  character: z.array(playerChessProfileOpeningCharacterSchema),
  theoreticalStatus: playerChessProfileOpeningTheoreticalStatusSchema.nullable(),
  theoryBurden: playerChessProfileOpeningTheoryBurdenSchema.nullable(),
  roles: z.array(playerChessProfileOpeningRoleSchema),
  confidence: playerChessProfileOpeningConfidenceSchema.nullable(),
  matchedRuleIds: z.array(z.string().min(1)),
  knowledge: candidateOpeningKnowledgeEvidenceSchema,
});
export type CandidateOpeningEvidence = z.infer<typeof candidateOpeningEvidenceSchema>;

export const candidateCourseReferenceSchema = z.object({
  nodeId: z.number().int().positive(),
  lineId: z.number().int().positive(),
  lineName: z.string().min(1),
  chapterId: z.number().int().positive(),
  chapterName: z.string().min(1),
  courseId: z.number().int().positive(),
  courseName: z.string().min(1),
});
export type CandidateCourseReference = z.infer<typeof candidateCourseReferenceSchema>;

export const candidateCourseEvidenceSchema = z.object({
  status: candidateEvidenceStatusSchema,
  covered: z.boolean(),
  conflict: z.boolean(),
  transposesToCoveredPosition: z.boolean(),
  references: z.array(candidateCourseReferenceSchema).max(3),
});
export type CandidateCourseEvidence = z.infer<typeof candidateCourseEvidenceSchema>;

export const candidateProfileMatchSchema = z.object({
  kind: z.enum(['PREFERENCE', 'PERFORMANCE']),
  dimension: playerChessProfileDimensionSchema,
  value: z.string().min(1),
  games: z.number().int().positive(),
  exposurePercent: z.number().min(0).max(100).nullable(),
  scoreDelta: z.number().min(-100).max(100).nullable(),
  evidenceStrength: playerChessProfileEvidenceStrengthSchema.nullable(),
});
export type CandidateProfileMatch = z.infer<typeof candidateProfileMatchSchema>;

export const candidatePlayerProfileEvidenceSchema = z.object({
  status: candidateEvidenceStatusSchema,
  generatedAt: z.iso.datetime({ offset: true }).nullable(),
  matches: z.array(candidateProfileMatchSchema).max(5),
});
export type CandidatePlayerProfileEvidence = z.infer<typeof candidatePlayerProfileEvidenceSchema>;

export const candidateFitSchema = z.object({
  status: candidateFitStatusSchema,
  reasonCodes: z.array(candidateReasonCodeSchema).max(8),
});
export type CandidateFit = z.infer<typeof candidateFitSchema>;

export const candidateEligibilitySchema = z.object({
  status: candidateEligibilityStatusSchema,
  reasonCodes: z.array(candidateReasonCodeSchema).max(8),
  warningCodes: z.array(candidateWarningCodeSchema).max(8),
});
export type CandidateEligibility = z.infer<typeof candidateEligibilitySchema>;

export const candidateRankingComponentsSchema = z.object({
  objective: z.number().int().min(-100).max(100),
  population: z.number().int().min(-100).max(100),
  masters: z.number().int().min(-100).max(100),
  personal: z.number().int().min(-100).max(100),
  targetFit: z.number().int().min(-100).max(100),
  profileFit: z.number().int().min(-100).max(100),
  course: z.number().int().min(-100).max(100),
});
export type CandidateRankingComponents = z.infer<typeof candidateRankingComponentsSchema>;

export const candidateCoverageEvidenceSchema = z.object({
  contributionPercent: z.number().min(0).max(100).nullable(),
  cumulativePercent: z.number().min(0).max(100).nullable(),
});
export type CandidateCoverageEvidence = z.infer<typeof candidateCoverageEvidenceSchema>;

export const candidateDecisionCandidateSchema = z.object({
  rank: z.number().int().positive(),
  moveUci: candidateMoveUciSchema,
  moveSan: z.string().min(1),
  resultingFen: z.string().min(1),
  previewUci: z.array(candidateMoveUciSchema).max(8),
  manuallyRequested: z.boolean(),
  eligibility: candidateEligibilitySchema,
  targetFit: candidateFitSchema,
  profileFit: candidateFitSchema,
  components: candidateRankingComponentsSchema,
  reasonCodes: z.array(candidateReasonCodeSchema).max(12),
  warningCodes: z.array(candidateWarningCodeSchema).max(12),
  coverage: candidateCoverageEvidenceSchema.nullable(),
  evidence: z.object({
    engine: candidateEngineEvidenceSchema,
    masters: candidateCorpusEvidenceSchema,
    population: candidateCorpusEvidenceSchema,
    personal: candidatePersonalEvidenceSchema,
    opening: candidateOpeningEvidenceSchema,
    course: candidateCourseEvidenceSchema,
    playerProfile: candidatePlayerProfileEvidenceSchema,
  }),
});
export type CandidateDecisionCandidate = z.infer<typeof candidateDecisionCandidateSchema>;

export const candidateDecisionSourceSummarySchema = z.object({
  engine: candidateEvidenceStatusSchema,
  masters: candidateEvidenceStatusSchema,
  population: candidateEvidenceStatusSchema,
  personal: candidateEvidenceStatusSchema,
  opening: candidateEvidenceStatusSchema,
  courses: candidateEvidenceStatusSchema,
  playerProfile: candidateEvidenceStatusSchema,
});
export type CandidateDecisionSourceSummary = z.infer<typeof candidateDecisionSourceSummarySchema>;

export const candidateDecisionResponseSchema = z.object({
  contractVersion: candidateDecisionContractVersionSchema,
  rankingPolicyVersion: candidateRankingPolicyVersionSchema,
  generatedAt: z.iso.datetime({ offset: true }),
  targetId: z.uuid(),
  decisionRole: candidateDecisionRoleSchema,
  fen: z.string().min(1),
  normalizedFen: z.string().min(1),
  sideToMove: z.enum(['WHITE', 'BLACK']),
  legalMoveCount: z.number().int().nonnegative(),
  returnedCandidateCount: z.number().int().nonnegative(),
  omittedLegalMoveCount: z.number().int().nonnegative(),
  requestedMoveIncluded: z.boolean(),
  sourceSummary: candidateDecisionSourceSummarySchema,
  candidates: z.array(candidateDecisionCandidateSchema).max(8),
});
export type CandidateDecisionResponse = z.infer<typeof candidateDecisionResponseSchema>;

export const candidateDecisionErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: z.enum([
    'INVALID_FEN',
    'DECISION_ROLE_MISMATCH',
    'ILLEGAL_INCLUDED_MOVE',
  ]),
});
export type CandidateDecisionErrorResponse = z.infer<typeof candidateDecisionErrorResponseSchema>;
