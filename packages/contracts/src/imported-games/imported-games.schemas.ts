import { z } from 'zod';

function csvArray<T extends z.ZodType>(itemSchema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }, z.array(itemSchema).optional());
}

const intCsv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item));
}, z.array(z.number().int().positive()).optional());

const boolParam = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

const lastParam = (value: unknown) => Array.isArray(value) ? value.at(-1) : value;
const isoDateStringSchema = z.union([z.iso.datetime({ offset: true }), z.iso.date()]);
const nullableDateTimeSchema = z.iso.datetime({ offset: true }).nullable();

export const importedGameProviderSchema = z.enum(['LICHESS', 'CHESS_COM']);
export const importedGameResultForUserSchema = z.enum(['WIN', 'DRAW', 'LOSS']);
export const importedGameUserColorSchema = z.enum(['WHITE', 'BLACK']);
export const importedGameAnalysisStatusSchema = z.enum(['NOT_ANALYZED', 'RUNNING', 'COMPLETED', 'FAILED']);
export const importedGamePlyIndexStatusSchema = z.enum(['NOT_INDEXED', 'INDEXED', 'FAILED']);
export const importedGameClassificationSchema = z.enum(['BEST', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER', 'BOOK', 'MISS']);

export const importedGameSearchQuerySchema = z.object({
  accountIds: intCsv,
  providers: csvArray(importedGameProviderSchema),
  from: isoDateStringSchema.optional(),
  to: isoDateStringSchema.optional(),
  resultForUser: csvArray(importedGameResultForUserSchema),
  userColor: csvArray(importedGameUserColorSchema),
  rated: boolParam,
  speedCategory: csvArray(z.string().min(1)),
  variant: csvArray(z.string().min(1)),
  openingEco: csvArray(z.string().min(1)),
  openingName: z.string().min(1).optional(),
  opponent: z.string().min(1).optional(),
  timeControl: z.string().min(1).optional(),
  minUserRating: z.coerce.number().int().min(0).optional(),
  maxUserRating: z.coerce.number().int().min(0).optional(),
  minOpponentRating: z.coerce.number().int().min(0).optional(),
  maxOpponentRating: z.coerce.number().int().min(0).optional(),
  analysisStatus: csvArray(importedGameAnalysisStatusSchema),
  plyIndexStatus: csvArray(importedGamePlyIndexStatusSchema),
  tagFilter: z.enum(['NO_TAGS']).optional(),
  tagCodes: intCsv,
  classification: csvArray(importedGameClassificationSchema),
  minAccuracy: z.coerce.number().min(0).max(100).optional(),
  maxAccuracy: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(['endedAtDesc', 'endedAtAsc']).default('endedAtDesc'),
  limit: z.preprocess(lastParam, z.coerce.number().int().min(1).max(200).default(50)),
  cursor: z.string().min(1).optional(),
});

export const importedGameAppliedFiltersSchema = z.object({
  accountIds: z.array(z.number().int().positive()).optional(),
  providers: z.array(importedGameProviderSchema).optional(),
  from: isoDateStringSchema.optional(),
  to: isoDateStringSchema.optional(),
  resultForUser: z.array(importedGameResultForUserSchema).optional(),
  userColor: z.array(importedGameUserColorSchema).optional(),
  rated: z.boolean().optional(),
  speedCategory: z.array(z.string().min(1)).optional(),
  variant: z.array(z.string().min(1)).optional(),
  openingEco: z.array(z.string().min(1)).optional(),
  openingName: z.string().min(1).optional(),
  opponent: z.string().min(1).optional(),
  timeControl: z.string().min(1).optional(),
  minUserRating: z.number().int().min(0).optional(),
  maxUserRating: z.number().int().min(0).optional(),
  minOpponentRating: z.number().int().min(0).optional(),
  maxOpponentRating: z.number().int().min(0).optional(),
  analysisStatus: z.array(importedGameAnalysisStatusSchema).optional(),
  plyIndexStatus: z.array(importedGamePlyIndexStatusSchema).optional(),
  tagFilter: z.enum(['NO_TAGS']).optional(),
  tagCodes: z.array(z.number().int().positive()).optional(),
  classification: z.array(importedGameClassificationSchema).optional(),
  minAccuracy: z.number().min(0).max(100).optional(),
  maxAccuracy: z.number().min(0).max(100).optional(),
  sort: z.enum(['endedAtDesc', 'endedAtAsc']),
  limit: z.number().int().min(1).max(200),
  cursor: z.string().min(1).optional(),
});

export const importedGameIdParamsSchema = z.object({
  gameId: z.coerce.number().int().positive(),
});

export const legacyApiErrorResponseSchema = z.object({ error: z.unknown() });
export const legacyMessageResponseSchema = z.object({ message: z.string() });

export const importedGameTagSchema = z.object({
  code: z.number().int(),
  name: z.string(),
});

export const positionAnalysisLineSchema = z.object({
  multipv: z.number().int().optional(),
  depth: z.number().int().optional(),
  moveUci: z.string().nullable().optional(),
  scoreCpWhite: z.number().nullable().optional(),
  mateWhite: z.number().nullable().optional(),
  pvUci: z.array(z.string()),
});

export const importedGamePositionAnalysisSchema = z.object({
  id: z.number().int(),
  bestMoveUci: z.string().nullable(),
  bestScoreCpWhite: z.number().nullable(),
  bestMateWhite: z.number().nullable(),
});

export const importedGamePlySchema = z.object({
  plyNumber: z.number().int(),
  moveUci: z.string(),
  normalizedFen: z.string(),
  scoreLossCp: z.number().int().nullable(),
  classificationCode: z.number().int().nullable(),
  classification: z.string(),
  positionAnalysis: importedGamePositionAnalysisSchema.nullable(),
});

export const importedGameListItemSchema = z.object({
  id: z.number().int().positive(),
  accountId: z.number().int().positive(),
  provider: importedGameProviderSchema,
  providerGameId: z.string(),
  providerUrl: z.string().nullable(),
  endedAt: nullableDateTimeSchema,
  startedAt: nullableDateTimeSchema,
  speedCategory: z.string().nullable(),
  rated: z.boolean().nullable(),
  variant: z.string().nullable(),
  timeControl: z.object({
    raw: z.string().nullable(),
    initial: z.number().int().nullable(),
    increment: z.number().int().nullable(),
  }),
  white: z.object({ username: z.string().nullable(), rating: z.number().int().nullable() }),
  black: z.object({ username: z.string().nullable(), rating: z.number().int().nullable() }),
  userColor: importedGameUserColorSchema.nullable(),
  opponentUsername: z.string().nullable(),
  result: z.string().nullable(),
  resultForUser: importedGameResultForUserSchema.nullable(),
  status: z.string().nullable(),
  opening: z.object({ eco: z.string().nullable(), name: z.string().nullable() }),
  tagCodes: z.array(z.number().int()),
  tags: z.array(importedGameTagSchema),
  plyIndex: z.object({
    status: importedGamePlyIndexStatusSchema,
    indexedAt: nullableDateTimeSchema,
    error: z.string().nullable(),
  }),
  analysis: z.object({
    status: importedGameAnalysisStatusSchema,
    runId: z.number().int().nullable(),
    depth: z.number().int().nullable(),
    completedAt: nullableDateTimeSchema,
    createdAt: nullableDateTimeSchema,
    whiteAccuracy: z.number().nullable(),
    blackAccuracy: z.number().nullable(),
    userAccuracy: z.number().nullable(),
    summary: z.unknown().nullable(),
    criticalMoveCount: z.number().int().nullable(),
  }),
});

export const importedGameSearchItemSchema = z.object({
  id: z.number().int().positive(),
  provider: importedGameProviderSchema,
  providerUrl: z.string().nullable(),
  endedAt: nullableDateTimeSchema,
  speedCategory: z.string().nullable(),
  rated: z.boolean().nullable(),
  timeControl: z.object({ raw: z.string().nullable(), initial: z.number().int().nullable(), increment: z.number().int().nullable() }),
  white: z.object({ username: z.string().nullable(), rating: z.number().int().nullable() }),
  black: z.object({ username: z.string().nullable(), rating: z.number().int().nullable() }),
  userColor: importedGameUserColorSchema.nullable(),
  resultForUser: importedGameResultForUserSchema.nullable(),
  opening: z.object({ eco: z.string().nullable(), name: z.string().nullable() }),
  tagCount: z.number().int().nonnegative(),
  plyIndex: z.object({ status: importedGamePlyIndexStatusSchema }),
  analysis: z.object({
    status: importedGameAnalysisStatusSchema,
    whiteAccuracy: z.number().nullable(),
    blackAccuracy: z.number().nullable(),
    userAccuracy: z.number().nullable(),
  }),
});

export const importedGameDetailResponseSchema = z.object({
  ...importedGameListItemSchema.shape,
  pgn: z.string().nullable(),
  plies: z.array(importedGamePlySchema),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const importedGameSearchResponseSchema = z.object({
  items: z.array(importedGameSearchItemSchema),
  pageInfo: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
  appliedFilters: importedGameAppliedFiltersSchema,
});

export const importedGamePgnResponseSchema = z.object({
  id: z.number().int().positive(),
  pgn: z.string().nullable(),
});

const facetCountSchema = z.object({ value: z.string(), count: z.number().int().nonnegative() });

export const importedGameFacetsResponseSchema = z.object({
  accounts: z.array(z.object({
    id: z.number().int().positive(),
    provider: importedGameProviderSchema,
    username: z.string(),
    displayName: z.string().nullable(),
    gameCount: z.number().int().nonnegative(),
  })),
  providers: z.array(z.object({ value: importedGameProviderSchema, count: z.number().int().nonnegative() })),
  speeds: z.array(facetCountSchema),
  variants: z.array(facetCountSchema),
  results: z.array(z.object({ value: importedGameResultForUserSchema, count: z.number().int().nonnegative() })),
  colors: z.array(z.object({ value: importedGameUserColorSchema, count: z.number().int().nonnegative() })),
  openings: z.array(z.object({ eco: z.string(), name: z.string().nullable(), count: z.number().int().nonnegative() })),
  analysisStatuses: z.array(z.object({ value: importedGameAnalysisStatusSchema, count: z.number().int().nonnegative() })),
  tags: z.array(z.object({ value: z.number().int(), name: z.string() })),
});

export const importedGameTagDefinitionsResponseSchema = z.object({
  items: z.array(importedGameTagSchema),
});

export type ImportedGameProvider = z.output<typeof importedGameProviderSchema>;
export type ImportedGameResultForUser = z.output<typeof importedGameResultForUserSchema>;
export type ImportedGameUserColor = z.output<typeof importedGameUserColorSchema>;
export type ImportedGameAnalysisStatus = z.output<typeof importedGameAnalysisStatusSchema>;
export type ImportedGamePlyIndexStatus = z.output<typeof importedGamePlyIndexStatusSchema>;
export type ImportedGameSearchQuery = z.output<typeof importedGameSearchQuerySchema>;
export type ImportedGameAppliedFilters = z.output<typeof importedGameAppliedFiltersSchema>;
export type ImportedGameListItem = z.output<typeof importedGameListItemSchema>;
export type ImportedGameSearchItem = z.output<typeof importedGameSearchItemSchema>;
export type ImportedGamePlayer = ImportedGameListItem['white'];
export type ImportedGameTimeControl = ImportedGameListItem['timeControl'];
export type ImportedGameOpening = ImportedGameListItem['opening'];
export type ImportedGameAnalysisSummary = ImportedGameListItem['analysis'];
export type ImportedGamePlyIndexSummary = ImportedGameListItem['plyIndex'];
export type ImportedGamePositionAnalysis = z.output<typeof importedGamePositionAnalysisSchema>;
export type ImportedGameDetail = z.output<typeof importedGameDetailResponseSchema>;
export type ImportedGamePly = z.output<typeof importedGamePlySchema>;
export type ImportedGameSearchResponse = z.output<typeof importedGameSearchResponseSchema>;
export type ImportedGamePageInfo = ImportedGameSearchResponse['pageInfo'];
export type ImportedGamePgnResponse = z.output<typeof importedGamePgnResponseSchema>;
export type ImportedGameFacetsResponse = z.output<typeof importedGameFacetsResponseSchema>;
export type ImportedGameTag = z.output<typeof importedGameTagSchema>;
export type ImportedGameTagDefinitionsResponse = z.output<typeof importedGameTagDefinitionsResponseSchema>;
