import { z } from 'zod';
import {
  importedGameAppliedFiltersSchema,
  importedGameProviderSchema,
  importedGameResultForUserSchema,
  importedGameUserColorSchema,
} from './imported-games.schemas';

export const OPENING_ANALYSIS_PERSONAL_MOVE_EVIDENCE_POLICY_VERSION = '2026-08-personal-move-v1' as const;

export const openingAnalysisWdlSchema = z.object({
  total: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  scorePct: z.number().nullable(),
});

export const openingAnalysisBookMatchSchema = z.object({
  eco: z.string(),
  name: z.string(),
  pgn: z.string(),
  uci: z.string(),
  epd: z.string(),
  ply: z.number().int().nonnegative(),
  source: z.enum(['ECO', 'FEN', 'MOVES']),
});

export const openingAnalysisPersonalMoveEvidenceSchema = z.object({
  policyVersion: z.literal(OPENING_ANALYSIS_PERSONAL_MOVE_EVIDENCE_POLICY_VERSION),
  familiarity: z.enum(['COMMON', 'RARE', 'NEW']),
  resultContext: z.enum(['ABOVE_BASELINE', 'BELOW_BASELINE', 'NEUTRAL', 'INSUFFICIENT']),
  resultSampleQualified: z.boolean(),
});

export const openingAnalysisAppliedFiltersSchema = importedGameAppliedFiltersSchema.extend({
  fen: z.string().min(1),
  normalizedFen: z.string().min(1),
  openingNameExact: z.string().min(1).optional(),
  rated: z.boolean(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});

export const openingAnalysisTopGamesAppliedFiltersSchema = openingAnalysisAppliedFiltersSchema.extend({
  limit: z.number().int().min(1).max(50),
});

export const openingAnalysisNextMoveSchema = z.object({
  moveUci: z.string(),
  moveSan: z.string().nullable(),
  fenAfter: z.string(),
  side: importedGameUserColorSchema,
  moveNumber: z.number().int().positive(),
  occurrences: z.number().int().nonnegative(),
  games: openingAnalysisWdlSchema,
  gameCount: z.number().int().nonnegative(),
  moveSharePercent: z.number().nullable(),
  scoreDeltaVsPositionPercent: z.number().nullable(),
  lastPlayedAt: z.iso.datetime({ offset: true }).nullable(),
  personalContext: openingAnalysisPersonalMoveEvidenceSchema,
});

export const openingAnalysisCoreResponseSchema = z.object({
  fen: z.string(),
  normalizedFen: z.string(),
  bookOpening: openingAnalysisBookMatchSchema.nullable(),
  sideToMove: importedGameUserColorSchema,
  fullMoveNumber: z.number().int().positive(),
  ratedOnly: z.boolean(),
  occurrences: z.number().int().nonnegative(),
  games: openingAnalysisWdlSchema,
  nextMoves: z.array(openingAnalysisNextMoveSchema),
  appliedFilters: openingAnalysisAppliedFiltersSchema,
});

export const openingAnalysisPerformanceTagStatSchema = z.object({
  code: z.number().int(),
  name: z.string(),
  games: z.number().int().nonnegative(),
  ratePct: z.number(),
  wdl: openingAnalysisWdlSchema,
});

export const openingAnalysisPerformanceBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  games: z.number().int().nonnegative(),
  ratePct: z.number(),
  tags: z.array(openingAnalysisPerformanceTagStatSchema),
});

export const openingAnalysisPerformanceSchema = z.object({
  sample: z.object({
    games: z.number().int().nonnegative(),
    taggedGames: z.number().int().nonnegative(),
  }),
  wdl: openingAnalysisWdlSchema,
  tags: z.array(openingAnalysisPerformanceTagStatSchema),
  buckets: z.array(openingAnalysisPerformanceBucketSchema),
});

export const openingAnalysisPerformanceResponseSchema = z.object({
  fen: z.string(),
  normalizedFen: z.string(),
  performance: openingAnalysisPerformanceSchema,
  appliedFilters: openingAnalysisAppliedFiltersSchema,
});

export const openingAnalysisGameSchema = z.object({
  id: z.number().int().positive(),
  provider: importedGameProviderSchema,
  endedAt: z.iso.datetime({ offset: true }).nullable(),
  speedCategory: z.string().nullable(),
  white: z.object({ username: z.string().nullable(), rating: z.number().int().nullable() }),
  black: z.object({ username: z.string().nullable(), rating: z.number().int().nullable() }),
  resultForUser: importedGameResultForUserSchema.nullable(),
  opening: z.object({ eco: z.string().nullable(), name: z.string().nullable() }),
  moveNumber: z.number().int().positive(),
  nextMoveUci: z.string(),
  nextMoveSan: z.string().nullable(),
});

export const openingAnalysisTopGamesResponseSchema = z.object({
  fen: z.string(),
  normalizedFen: z.string(),
  topGames: z.array(openingAnalysisGameSchema),
  appliedFilters: openingAnalysisTopGamesAppliedFiltersSchema,
});

export type OpeningAnalysisWdl = z.output<typeof openingAnalysisWdlSchema>;
export type OpeningAnalysisBookMatch = z.output<typeof openingAnalysisBookMatchSchema>;
export type OpeningAnalysisPersonalMoveEvidence = z.output<typeof openingAnalysisPersonalMoveEvidenceSchema>;
export type OpeningAnalysisAppliedFilters = z.output<typeof openingAnalysisAppliedFiltersSchema>;
export type OpeningAnalysisTopGamesAppliedFilters = z.output<typeof openingAnalysisTopGamesAppliedFiltersSchema>;
export type OpeningAnalysisNextMove = z.output<typeof openingAnalysisNextMoveSchema>;
export type OpeningAnalysisCoreResponse = z.output<typeof openingAnalysisCoreResponseSchema>;
export type OpeningAnalysisPerformanceTagStat = z.output<typeof openingAnalysisPerformanceTagStatSchema>;
export type OpeningAnalysisPerformanceBucket = z.output<typeof openingAnalysisPerformanceBucketSchema>;
export type OpeningAnalysisPerformance = z.output<typeof openingAnalysisPerformanceSchema>;
export type OpeningAnalysisPerformanceResponse = z.output<typeof openingAnalysisPerformanceResponseSchema>;
export type OpeningAnalysisGame = z.output<typeof openingAnalysisGameSchema>;
export type OpeningAnalysisTopGamesResponse = z.output<typeof openingAnalysisTopGamesResponseSchema>;
