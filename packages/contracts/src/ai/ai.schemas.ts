import { z } from 'zod';

export const aiCapabilitiesResponseSchema = z.object({
  widgets: z.object({
    gameReview: z.boolean(),
  }),
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
export type AiGameReviewResponse = z.output<typeof aiGameReviewResponseSchema>;
export type AiGameReviewStateResponse = z.output<typeof aiGameReviewStateResponseSchema>;
export type AiGameReviewTurningPoint = z.output<typeof aiGameReviewTurningPointSchema>;
export type AiGameReviewWarning = z.output<typeof aiGameReviewWarningSchema>;
