import { z } from 'zod';
import {
  importedGameUserColorSchema,
} from '../imported-games';
import {
  lichessGamesPeerResolutionSchema,
  lichessGamesSpeedPresetSchema,
} from '../opening-explorer';

function csvArray<T extends z.ZodType>(itemSchema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }, z.array(itemSchema).min(1).optional());
}

const intCsv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item));
}, z.array(z.number().int().positive()).min(1).optional());

const boolParam = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

const lastParam = (value: unknown) => Array.isArray(value) ? value.at(-1) : value;
const percentageSchema = z.number().min(0).max(100).nullable();

export const playerChessProfileQuerySchema = z.object({
  accountIds: intCsv,
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  speedPreset: lichessGamesSpeedPresetSchema.default('BLITZ_AND_SLOWER'),
  colors: csvArray(importedGameUserColorSchema).default(['WHITE', 'BLACK']),
  rated: boolParam.default(true),
  minUserRating: z.coerce.number().int().min(0).optional(),
  maxUserRating: z.coerce.number().int().min(0).optional(),
  minOpponentRating: z.coerce.number().int().min(0).optional(),
  maxOpponentRating: z.coerce.number().int().min(0).optional(),
  supportingGamesLimit: z.preprocess(
    lastParam,
    z.coerce.number().int().min(1).max(10).default(5),
  ),
}).superRefine((query, context) => {
  if (query.from && query.to && query.from > query.to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'from must not be after to',
    });
  }
  if (
    query.minUserRating !== undefined
    && query.maxUserRating !== undefined
    && query.minUserRating > query.maxUserRating
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minUserRating'],
      message: 'minUserRating must not exceed maxUserRating',
    });
  }
  if (
    query.minOpponentRating !== undefined
    && query.maxOpponentRating !== undefined
    && query.minOpponentRating > query.maxOpponentRating
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minOpponentRating'],
      message: 'minOpponentRating must not exceed maxOpponentRating',
    });
  }
});
export type PlayerChessProfileQuery = z.infer<typeof playerChessProfileQuerySchema>;

export const playerChessProfileEvidenceStrengthSchema = z.enum([
  'INSUFFICIENT',
  'LOW',
  'MEDIUM',
  'HIGH',
]);
export type PlayerChessProfileEvidenceStrength = z.infer<typeof playerChessProfileEvidenceStrengthSchema>;

export const playerChessProfileDimensionSchema = z.enum([
  'CHARACTER',
  'SOUNDNESS',
  'THEORETICAL_STATUS',
  'THEORY_BURDEN',
  'ROLE',
]);
export type PlayerChessProfileDimension = z.infer<typeof playerChessProfileDimensionSchema>;

export const playerChessProfileOpeningSoundnessSchema = z.enum([
  'SOUND',
  'PLAYABLE',
  'RISKY',
  'DUBIOUS',
  'UNKNOWN',
]);
export const playerChessProfileOpeningCharacterSchema = z.enum([
  'SOLID',
  'BALANCED',
  'POSITIONAL',
  'DYNAMIC',
  'SHARP',
  'TACTICAL',
  'SURPRISE',
]);
export const playerChessProfileOpeningTheoreticalStatusSchema = z.enum([
  'PRINCIPAL',
  'MAINLINE',
  'SIDELINE',
  'SURPRISE',
  'UNKNOWN',
]);
export const playerChessProfileOpeningTheoryBurdenSchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'UNKNOWN',
]);
export const playerChessProfileOpeningRoleSchema = z.enum([
  'INITIATOR',
  'RESPONDER',
  'GAMBIT_OFFERER',
  'GAMBIT_ACCEPTOR',
  'GAMBIT_DECLINER',
]);
export const playerChessProfileOpeningConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const playerChessProfileOpeningClassificationSchema = z.object({
  version: z.string().min(1),
  source: z.enum(['GENERATED_BOOK', 'STORED_NAME_ECO']),
  side: importedGameUserColorSchema,
  soundness: playerChessProfileOpeningSoundnessSchema,
  character: z.array(playerChessProfileOpeningCharacterSchema),
  theoreticalStatus: playerChessProfileOpeningTheoreticalStatusSchema,
  theoryBurden: playerChessProfileOpeningTheoryBurdenSchema,
  roles: z.array(playerChessProfileOpeningRoleSchema),
  confidence: playerChessProfileOpeningConfidenceSchema,
  matchedRuleIds: z.array(z.string().min(1)),
});
export type PlayerChessProfileOpeningClassification = z.infer<typeof playerChessProfileOpeningClassificationSchema>;

export const playerChessProfileWdlSchema = z.object({
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
});
export type PlayerChessProfileWdl = z.infer<typeof playerChessProfileWdlSchema>;

export const playerChessProfileOpeningReferenceSchema = z.object({
  eco: z.string().min(1).nullable(),
  name: z.string().min(1).nullable(),
  userColor: importedGameUserColorSchema,
  games: z.number().int().positive(),
});
export type PlayerChessProfileOpeningReference = z.infer<typeof playerChessProfileOpeningReferenceSchema>;

export const playerChessProfileBaselineSchema = z.object({
  games: z.number().int().nonnegative(),
  analysedGames: z.number().int().nonnegative(),
  accuracyGames: z.number().int().nonnegative(),
  wdl: playerChessProfileWdlSchema,
  scorePercent: percentageSchema,
  openingPositiveRate: percentageSchema,
  openingTroubleRate: percentageSchema,
  earlyMistakeRate: percentageSchema,
  averageAccuracy: percentageSchema,
});
export type PlayerChessProfileBaseline = z.infer<typeof playerChessProfileBaselineSchema>;

export const playerChessProfilePreferenceItemSchema = z.object({
  dimension: playerChessProfileDimensionSchema,
  value: z.string().min(1),
  games: z.number().int().positive(),
  exposurePercent: z.number().min(0).max(100),
  confidenceGames: z.object({
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
  }),
  supportingOpenings: z.array(playerChessProfileOpeningReferenceSchema).max(3),
});
export type PlayerChessProfilePreferenceItem = z.infer<typeof playerChessProfilePreferenceItemSchema>;

export const playerChessProfilePerformanceItemSchema = z.object({
  dimension: playerChessProfileDimensionSchema,
  value: z.string().min(1),
  games: z.number().int().positive(),
  analysedGames: z.number().int().nonnegative(),
  accuracyGames: z.number().int().nonnegative(),
  wdl: playerChessProfileWdlSchema,
  scorePercent: percentageSchema,
  baselineScorePercent: percentageSchema,
  scoreDelta: z.number().min(-100).max(100).nullable(),
  openingPositiveRate: percentageSchema,
  openingTroubleRate: percentageSchema,
  earlyMistakeRate: percentageSchema,
  averageAccuracy: percentageSchema,
  resultEvidenceStrength: playerChessProfileEvidenceStrengthSchema,
  analysisEvidenceStrength: playerChessProfileEvidenceStrengthSchema,
  supportingOpenings: z.array(playerChessProfileOpeningReferenceSchema).max(3),
});
export type PlayerChessProfilePerformanceItem = z.infer<typeof playerChessProfilePerformanceItemSchema>;

export const playerChessProfileOpeningGroupSchema = z.object({
  eco: z.string().min(1).nullable(),
  name: z.string().min(1).nullable(),
  userColor: importedGameUserColorSchema,
  games: z.number().int().positive(),
  analysedGames: z.number().int().nonnegative(),
  accuracyGames: z.number().int().nonnegative(),
  wdl: playerChessProfileWdlSchema,
  scorePercent: percentageSchema,
  openingPositiveRate: percentageSchema,
  openingTroubleRate: percentageSchema,
  earlyMistakeRate: percentageSchema,
  averageAccuracy: percentageSchema,
  classification: playerChessProfileOpeningClassificationSchema.nullable(),
});
export type PlayerChessProfileOpeningGroup = z.infer<typeof playerChessProfileOpeningGroupSchema>;

export const playerChessProfileConclusionSchema = z.object({
  code: z.enum([
    'INSUFFICIENT_DATA',
    'PREFERENCE',
    'PERFORMS_BETTER',
    'PERFORMS_WORSE',
    'OPENING_TROUBLE',
  ]),
  dimension: playerChessProfileDimensionSchema.nullable(),
  value: z.string().min(1).nullable(),
  metric: z.enum([
    'EXPOSURE_PERCENT',
    'SCORE_PERCENT',
    'OPENING_TROUBLE_RATE',
    'NONE',
  ]),
  sampleSize: z.number().int().nonnegative(),
  metricValue: z.number().nullable(),
  baselineValue: z.number().nullable(),
  delta: z.number().nullable(),
  evidenceStrength: playerChessProfileEvidenceStrengthSchema,
  summary: z.string().min(1),
});
export type PlayerChessProfileConclusion = z.infer<typeof playerChessProfileConclusionSchema>;

export const playerChessProfileSupportingGameSchema = z.object({
  id: z.number().int().positive(),
  provider: z.string().min(1),
  providerUrl: z.string().nullable(),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
  speedCategory: z.string().nullable(),
  userColor: importedGameUserColorSchema,
  resultForUser: z.enum(['WIN', 'DRAW', 'LOSS']).nullable(),
  openingEco: z.string().nullable(),
  openingName: z.string().nullable(),
  userRating: z.number().int().nullable(),
  opponentRating: z.number().int().nullable(),
  analysisStatus: z.string().nullable(),
  accuracy: z.number().min(0).max(100).nullable(),
});
export type PlayerChessProfileSupportingGame = z.infer<typeof playerChessProfileSupportingGameSchema>;

export const playerChessProfileResponseSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  filters: z.object({
    accountIds: z.array(z.number().int().positive()).optional(),
    range: z.object({ from: z.iso.date(), to: z.iso.date() }),
    speedPreset: lichessGamesSpeedPresetSchema,
    speeds: z.array(z.enum(['bullet', 'blitz', 'rapid'])).min(1),
    colors: z.array(importedGameUserColorSchema).min(1),
    rated: z.boolean(),
    minUserRating: z.number().int().nonnegative().optional(),
    maxUserRating: z.number().int().nonnegative().optional(),
    minOpponentRating: z.number().int().nonnegative().optional(),
    maxOpponentRating: z.number().int().nonnegative().optional(),
  }),
  peerLevel: lichessGamesPeerResolutionSchema,
  classificationVersion: z.string().min(1),
  coverage: z.object({
    totalGames: z.number().int().nonnegative(),
    indexedGames: z.number().int().nonnegative(),
    analysedGames: z.number().int().nonnegative(),
    analysisPercent: percentageSchema,
    namedOpeningGames: z.number().int().nonnegative(),
    profiledOpeningGames: z.number().int().nonnegative(),
    omittedOpeningGames: z.number().int().nonnegative(),
    classifiedOpeningGames: z.number().int().nonnegative(),
    lowConfidenceOpeningGames: z.number().int().nonnegative(),
    unknownDimensionOpeningGames: z.number().int().nonnegative(),
    openingGroupLimit: z.number().int().positive(),
    openingGroupsTruncated: z.boolean(),
  }),
  baseline: playerChessProfileBaselineSchema,
  preference: z.object({
    items: z.array(playerChessProfilePreferenceItemSchema),
  }),
  performance: z.object({
    items: z.array(playerChessProfilePerformanceItemSchema),
  }),
  openingGroups: z.array(playerChessProfileOpeningGroupSchema),
  conclusions: z.array(playerChessProfileConclusionSchema),
  supportingGames: z.array(playerChessProfileSupportingGameSchema).max(10),
});
export type PlayerChessProfileResponse = z.infer<typeof playerChessProfileResponseSchema>;

export const playerChessProfileErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: z.enum(['INVALID_RANGE']),
});
export type PlayerChessProfileErrorResponse = z.infer<typeof playerChessProfileErrorResponseSchema>;
