import { z } from 'zod';

function csvArray<T extends z.ZodTypeAny>(itemSchema: T) {
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
const searchLimitParam = z.preprocess(lastParam, z.coerce.number().int().min(1).max(200).default(50));
const topGamesLimitParam = z.preprocess(lastParam, z.coerce.number().int().min(1).max(50).default(10));

const providerSchema = z.enum(['LICHESS', 'CHESS_COM']);
const resultForUserSchema = z.enum(['WIN', 'DRAW', 'LOSS']);
const colorSchema = z.enum(['WHITE', 'BLACK']);
const analysisStatusSchema = z.enum(['NOT_ANALYZED', 'RUNNING', 'COMPLETED', 'FAILED']);
const plyIndexStatusSchema = z.enum(['NOT_INDEXED', 'INDEXED', 'FAILED']);
const tagFilterSchema = z.enum(['NO_TAGS']);
const classificationSchema = z.enum(['BEST', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER', 'BOOK', 'MISS']);

export const importedGameSearchQuerySchema = z.object({
  accountIds: intCsv,
  providers: csvArray(providerSchema),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  resultForUser: csvArray(resultForUserSchema),
  userColor: csvArray(colorSchema),
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
  analysisStatus: csvArray(analysisStatusSchema),
  plyIndexStatus: csvArray(plyIndexStatusSchema),
  tagFilter: tagFilterSchema.optional(),
  tagCodes: intCsv,
  classification: csvArray(classificationSchema),
  minAccuracy: z.coerce.number().min(0).max(100).optional(),
  maxAccuracy: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(['endedAtDesc', 'endedAtAsc']).default('endedAtDesc'),
  limit: searchLimitParam,
  cursor: z.string().min(1).optional(),
});

export type ImportedGameSummaryQuery = Omit<z.infer<typeof importedGameSearchQuerySchema>, 'sort' | 'limit' | 'cursor'>;

export const openingAnalysisQuerySchema = importedGameSearchQuerySchema.extend({
  fen: z.string().min(1).default('startpos'),
});

export const openingAnalysisTopGamesQuerySchema = openingAnalysisQuerySchema.extend({
  limit: topGamesLimitParam,
});

export type ImportedGameSearchQuery = z.infer<typeof importedGameSearchQuerySchema>;
export type OpeningAnalysisQuery = z.infer<typeof openingAnalysisQuerySchema>;
export type OpeningAnalysisTopGamesQuery = z.infer<typeof openingAnalysisTopGamesQuerySchema>;
