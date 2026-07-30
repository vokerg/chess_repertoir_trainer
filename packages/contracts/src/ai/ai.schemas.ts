import { z } from 'zod';
import {
  candidateDecisionRequestSchema,
  candidateDecisionRoleSchema,
  candidateMoveUciSchema,
  candidateRankingPolicyVersionSchema,
} from '../candidate-decision';

export const aiCapabilitiesResponseSchema = z.object({
  widgets: z.object({
    gameReview: z.boolean(),
    builderCandidateExplanation: z.boolean(),
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
export type AiGameReviewResponse = z.output<typeof aiGameReviewResponseSchema>;
export type AiGameReviewStateResponse = z.output<typeof aiGameReviewStateResponseSchema>;
export type AiGameReviewTurningPoint = z.output<typeof aiGameReviewTurningPointSchema>;
export type AiGameReviewWarning = z.output<typeof aiGameReviewWarningSchema>;
