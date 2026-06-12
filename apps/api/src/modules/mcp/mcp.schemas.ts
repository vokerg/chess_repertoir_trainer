import { z } from 'zod';
import {
  importedGameSearchQuerySchema,
  ImportedGameSearchQuery,
  ImportedGameSummaryQuery,
  openingAnalysisQuerySchema,
  OpeningAnalysisQuery,
} from '../imported-games/imported-games.schemas';
import { boardImagePovSchema, boardImageTurnSchema } from '../board-images/board-images.schemas';

const providerSchema = z.enum(['LICHESS', 'CHESS_COM']);
const resultSchema = z.enum(['WIN', 'DRAW', 'LOSS']);
const colorSchema = z.enum(['WHITE', 'BLACK']);
const analysisStatusSchema = z.enum(['NOT_ANALYZED', 'RUNNING', 'COMPLETED', 'FAILED']);
const plyIndexStatusSchema = z.enum(['NOT_INDEXED', 'INDEXED', 'FAILED']);
const classificationSchema = z.enum(['BOOK', 'BEST', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER', 'MISS']);

const importedGameFilterShape = {
  accountIds: z.array(z.number().int().positive()).optional(),
  providers: z.array(providerSchema).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  result: z.array(resultSchema).optional(),
  resultForUser: z.array(resultSchema).optional(),
  userColor: z.array(colorSchema).optional(),
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
  analysisStatus: z.array(analysisStatusSchema).optional(),
  plyIndexStatus: z.array(plyIndexStatusSchema).optional(),
  classification: z.array(classificationSchema).optional(),
  minAccuracy: z.number().min(0).max(100).optional(),
  maxAccuracy: z.number().min(0).max(100).optional(),
};

export const searchImportedGamesInputSchema = z.object({
  ...importedGameFilterShape,
  sort: z.enum(['endedAtDesc', 'endedAtAsc']).default('endedAtDesc'),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).optional(),
});

export const summarizeImportedGamesInputSchema = z.object({
  ...importedGameFilterShape,
});

export const getImportedGameInputSchema = z.object({
  gameId: z.number().int().positive(),
  includePlies: z.boolean().default(true),
});

export const getImportedGamePgnInputSchema = z.object({
  gameId: z.number().int().positive(),
});

export const getImportedGameAnalysisInputSchema = getImportedGamePgnInputSchema;

export const getImportedGameFacetsInputSchema = z.object({});

export const getOpeningAnalysisInputSchema = z.object({
  ...importedGameFilterShape,
  fen: z.string().min(1).default('startpos'),
  limit: z.number().int().min(1).max(100).default(50),
});

export const getBoardImageUrlInputSchema = z.object({
  fen: z.string().min(1).default('startpos'),
  pov: boardImagePovSchema.default('white'),
  turn: boardImageTurnSchema.default('none'),
});

type ImportedGameFilterInput = z.infer<typeof summarizeImportedGamesInputSchema> &
  Partial<Pick<z.infer<typeof searchImportedGamesInputSchema>, 'sort' | 'limit' | 'cursor'>>;

function toBackendFilterInput(input: ImportedGameFilterInput) {
  const { result, from, to, ...filters } = input;
  return {
    ...filters,
    resultForUser: input.resultForUser ?? result,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };
}

export function toImportedGameSearchQuery(input: z.infer<typeof searchImportedGamesInputSchema>): ImportedGameSearchQuery {
  return importedGameSearchQuerySchema.parse(toBackendFilterInput(input));
}

export function toImportedGameSummaryQuery(input: z.infer<typeof summarizeImportedGamesInputSchema>): ImportedGameSummaryQuery {
  const { sort: _sort, limit: _limit, cursor: _cursor, ...query } = importedGameSearchQuerySchema.parse(
    toBackendFilterInput({
      ...input,
      sort: 'endedAtDesc',
    }),
  );
  return query;
}

export function toOpeningAnalysisQuery(input: z.infer<typeof getOpeningAnalysisInputSchema>): OpeningAnalysisQuery {
  return openingAnalysisQuerySchema.parse({
    ...toBackendFilterInput({
      ...input,
      sort: 'endedAtDesc',
    }),
    fen: input.fen,
  });
}
