import { z } from 'zod';
import {
  importedGameAnalysisStatusSchema,
  importedGameClassificationSchema,
  importedGamePlyIndexStatusSchema,
  importedGameProviderSchema,
  importedGameResultForUserSchema,
  importedGameUserColorSchema,
} from '../imported-games/imported-games.schemas';

const isoDateTimeSchema = z.iso.datetime({ offset: true });
const nonNegativeIntSchema = z.number().int().nonnegative();

export const courseReviewColorSchema = z.enum(['WHITE', 'BLACK']);

export const courseReviewExampleSchema = z.object({
  gameId: z.number().int().positive(),
  provider: z.string(),
  providerGameId: z.string().nullable(),
  providerUrl: z.string().nullable(),
  endedAt: isoDateTimeSchema.nullable(),
  opponentUsername: z.string().nullable(),
  resultForUser: importedGameResultForUserSchema.nullable(),
  plyNumber: z.number().int().positive().nullable(),
});

export const courseReviewLineAnchorSchema = z.object({
  kind: z.enum(['LINE_START', 'NODE']),
  lineId: z.number().int().positive(),
  lineName: z.string(),
  chapterId: z.number().int().positive(),
  nodeId: z.number().int().positive().nullable(),
  moveSequenceSan: z.string().nullable(),
});

export const courseReviewGroupSchema = z.object({
  key: z.string(),
  status: z.enum(['MY_DEVIATION', 'OPPONENT_UNCOVERED']),
  normalizedFenBefore: z.string(),
  sideToMove: courseReviewColorSchema,
  playedMoveUci: z.string(),
  playedSan: z.string().nullable(),
  moveSequenceSan: z.string().nullable(),
  expectedMoveUci: z.string().nullable(),
  expectedMoveUcis: z.array(z.string()),
  expectedMoveSans: z.array(z.string()),
  count: z.number().int().positive(),
  results: z.object({
    win: nonNegativeIntSchema,
    draw: nonNegativeIntSchema,
    loss: nonNegativeIntSchema,
    unknown: nonNegativeIntSchema,
  }),
  examples: z.array(courseReviewExampleSchema).max(10),
  lineAnchors: z.array(courseReviewLineAnchorSchema),
});

const courseReviewConflictLineRefSchema = z.object({
  lineId: z.number().int().positive(),
  lineName: z.string(),
  nodeId: z.number().int().positive().nullable(),
  moveSequenceSan: z.string().nullable().optional(),
});

export const courseReviewConflictSchema = z.object({
  normalizedFenBefore: z.string(),
  sideToMove: courseReviewColorSchema,
  moves: z.array(z.object({
    moveUci: z.string(),
    moveSan: z.string(),
    lineRefs: z.array(courseReviewConflictLineRefSchema),
  })),
});

export const courseReviewAppliedFiltersSchema = z.object({
  accountIds: z.array(z.number().int().positive()).optional(),
  providers: z.array(importedGameProviderSchema).optional(),
  from: isoDateTimeSchema,
  to: isoDateTimeSchema.optional(),
  resultForUser: z.array(importedGameResultForUserSchema).optional(),
  userColor: z.array(importedGameUserColorSchema).optional(),
  rated: z.boolean().optional(),
  speedCategory: z.array(z.string().min(1)).optional(),
  variant: z.array(z.string().min(1)).optional(),
  openingEco: z.array(z.string().min(1)).optional(),
  openingName: z.string().min(1).optional(),
  opponent: z.string().min(1).optional(),
  timeControl: z.string().min(1).optional(),
  minUserRating: z.number().int().nonnegative().optional(),
  maxUserRating: z.number().int().nonnegative().optional(),
  minOpponentRating: z.number().int().nonnegative().optional(),
  maxOpponentRating: z.number().int().nonnegative().optional(),
  analysisStatus: z.array(importedGameAnalysisStatusSchema).optional(),
  plyIndexStatus: z.array(importedGamePlyIndexStatusSchema).optional(),
  tagFilter: z.enum(['NO_TAGS']).optional(),
  tagCodes: z.array(z.number().int().positive()).optional(),
  classification: z.array(importedGameClassificationSchema).optional(),
  minAccuracy: z.number().min(0).max(100).optional(),
  maxAccuracy: z.number().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(500),
  offset: z.number().int().nonnegative(),
  minCoveredPlies: z.number().int().min(0).max(20),
});

export const courseReviewResponseSchema = z.object({
  course: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().nullable(),
    sideToTrain: courseReviewColorSchema.nullable(),
    hasMixedSides: z.boolean(),
    lineCount: nonNegativeIntSchema,
    moveCount: nonNegativeIntSchema,
  }),
  filters: courseReviewAppliedFiltersSchema,
  summary: z.object({
    gamesChecked: nonNegativeIntSchema,
    indexedGames: nonNegativeIntSchema,
    inScopeGames: nonNegativeIntSchema,
    outOfScopeGames: nonNegativeIntSchema,
    gameEndedInsideRepertoire: nonNegativeIntSchema,
    repertoireEnded: nonNegativeIntSchema,
    myDeviations: nonNegativeIntSchema,
    opponentUncovered: nonNegativeIntSchema,
    unindexedGames: nonNegativeIntSchema,
    courseConflicts: nonNegativeIntSchema,
  }),
  conflicts: z.array(courseReviewConflictSchema),
  myDeviations: z.array(courseReviewGroupSchema),
  opponentUncovered: z.array(courseReviewGroupSchema),
  pagination: z.object({
    limit: z.number().int().min(1).max(500),
    offset: z.number().int().nonnegative(),
    returnedGames: nonNegativeIntSchema,
  }),
});

export type CourseReviewColor = z.output<typeof courseReviewColorSchema>;
export type CourseReviewExample = z.output<typeof courseReviewExampleSchema>;
export type CourseReviewLineAnchor = z.output<typeof courseReviewLineAnchorSchema>;
export type CourseReviewGroup = z.output<typeof courseReviewGroupSchema>;
export type CourseReviewConflict = z.output<typeof courseReviewConflictSchema>;
export type CourseReviewAppliedFilters = z.output<typeof courseReviewAppliedFiltersSchema>;
export type CourseReviewResponse = z.output<typeof courseReviewResponseSchema>;
