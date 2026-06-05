import { z } from 'zod';

const smallIntSchema = z.coerce.number().int().min(-32768).max(32767);

const engineLineSchema = z.object({
  multipv: z.coerce.number().int().min(1).max(3).optional(),
  depth: z.coerce.number().int().min(0).max(255).optional(),
  moveUci: z.string().min(4).max(5).optional(),
  scoreCpWhite: smallIntSchema.optional(),
  mateWhite: smallIntSchema.optional(),
  pvUci: z.array(z.string().min(4).max(5)).min(1),
});

export const positionAnalysisLookupSchema = z.object({
  fen: z.string().min(1),
});

export const bulkPositionAnalysisLookupSchema = z.object({
  fens: z.array(z.string().min(1)).min(1).max(1000),
});

export const storePositionAnalysisSchema = z.object({
  fen: z.string().min(1),
  bestMoveUci: z.string().min(4).max(5).optional(),
  bestScoreCpWhite: smallIntSchema.optional(),
  bestMateWhite: smallIntSchema.optional(),
  lines: z.array(engineLineSchema).max(3).optional(),
});

const nullableSmallIntSchema = z.union([smallIntSchema, z.null()]);
const nullableClassificationCodeSchema = z.union([z.coerce.number().int().min(1).max(9), z.null()]);

export const updatePlyAnalysisSchema = z.object({
  plies: z.array(z.object({
    plyNumber: z.coerce.number().int().min(1).max(32767),
    scoreLossCp: nullableSmallIntSchema,
    classificationCode: nullableClassificationCodeSchema,
  })).min(1).max(500),
});

export const clientGameAnalysisRunSchema = z.object({
  positionsDone: z.coerce.number().int().min(0).optional(),
  summary: z.unknown().optional(),
});
