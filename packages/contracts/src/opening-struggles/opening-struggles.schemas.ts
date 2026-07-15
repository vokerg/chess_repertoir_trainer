import { z } from 'zod';
import {
  importedGameSearchQuerySchema,
  importedGameUserColorSchema,
} from '../imported-games';

export const openingStrugglesModeSchema = z.enum([
  'results',
  'repeatedMistakes',
  'badPositions',
]);

export const openingStruggleCoverageStatusSchema = z.enum([
  'COVERED',
  'MY_DEVIATION',
  'OPPONENT_UNCOVERED',
  'REPERTOIRE_ENDED',
  'NOT_COVERED',
]);

const importedGameFiltersSchema = importedGameSearchQuerySchema.omit({
  sort: true,
  cursor: true,
  limit: true,
});

export const openingStrugglesQuerySchema = importedGameFiltersSchema.extend({
  mode: openingStrugglesModeSchema.default('results'),
  minGames: z.coerce.number().int().min(1).default(5),
  minLossRate: z.coerce.number().min(0).max(100).default(60),
  minOccurrences: z.coerce.number().int().min(1).default(5),
  minAverageCentipawnLoss: z.coerce.number().min(0).default(60),
  minEvaluatedGames: z.coerce.number().int().min(1).default(5),
  maxAverageUserEvalCp: z.coerce.number().default(-80),
  maxPly: z.coerce.number().int().min(1).max(60).default(20),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const openingStruggleCourseReferenceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

export const openingStruggleCourseCoverageSchema = z.object({
  status: openingStruggleCoverageStatusSchema,
  coveredPlies: z.number().int().nonnegative(),
  deviationPly: z.number().int().positive().nullable(),
  courses: z.array(openingStruggleCourseReferenceSchema),
  expectedMoveSans: z.array(z.string()),
});

export const openingStruggleItemSchema = z.object({
  key: z.string(),
  parentKey: z.string().nullable(),
  userColor: importedGameUserColorSchema,
  movesUci: z.array(z.string()),
  movesSan: z.array(z.string()).optional(),
  ply: z.number().int().positive(),
  analysisGameId: z.number().int().positive().nullable(),
  totalReachGames: z.number().int().nonnegative(),
  metricGames: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(100).nullable(),
  lossRate: z.number().min(0).max(100).nullable(),
  scorePct: z.number().min(0).max(100).nullable(),
  analysedMoveCount: z.number().int().nonnegative(),
  averageCentipawnLoss: z.number().nonnegative().nullable(),
  evalGames: z.number().int().nonnegative(),
  avgUserEvalCp: z.number().int().nullable(),
  bestUserEvalCp: z.number().nullable(),
  worstUserEvalCp: z.number().nullable(),
  afterPositionAnalysisId: z.number().int().positive().nullable(),
  afterPositionNormalizedFen: z.string().nullable(),
  afterPositionBestScoreCpWhite: z.number().nullable(),
  afterPositionBestMateWhite: z.number().nullable(),
  courseCoverage: openingStruggleCourseCoverageSchema,
});

export const openingStrugglesResponseSchema = z.object({
  totalFilteredGames: z.number().int().nonnegative(),
  indexedFilteredGames: z.number().int().nonnegative(),
  maxPly: z.number().int().positive(),
  limit: z.number().int().positive(),
  mode: openingStrugglesModeSchema,
  minGames: z.number().int().positive().optional(),
  minLossRate: z.number().min(0).max(100).optional(),
  minOccurrences: z.number().int().positive().optional(),
  minAverageCentipawnLoss: z.number().nonnegative().optional(),
  minEvaluatedGames: z.number().int().positive().optional(),
  maxAverageUserEvalCp: z.number().optional(),
  items: z.array(openingStruggleItemSchema),
});

export const openingStrugglesScopeTooLargeResponseSchema = z.object({
  error: z.object({
    code: z.literal('OPENING_STRUGGLES_SCOPE_TOO_LARGE'),
    message: z.string(),
    candidateGames: z.number().int().nonnegative(),
    maxCandidateGames: z.number().int().positive(),
  }),
});

export type OpeningStrugglesMode = z.infer<typeof openingStrugglesModeSchema>;
export type OpeningStruggleCoverageStatus = z.infer<typeof openingStruggleCoverageStatusSchema>;
export type OpeningStrugglesQuery = z.infer<typeof openingStrugglesQuerySchema>;
export type OpeningStruggleCourseCoverage = z.infer<typeof openingStruggleCourseCoverageSchema>;
export type OpeningStruggleItem = z.infer<typeof openingStruggleItemSchema>;
export type OpeningStrugglesResponse = z.infer<typeof openingStrugglesResponseSchema>;
export type OpeningStrugglesScopeTooLargeResponse = z.infer<typeof openingStrugglesScopeTooLargeResponseSchema>;
