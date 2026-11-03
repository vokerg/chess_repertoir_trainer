import { z } from 'zod';
import { storedPositionAnalysisLineSchema } from '../analysis/analysis.schemas';

/**
 * Cache-compatible analysis input, not a persisted PositionAnalysis row:
 * database IDs are assigned only when the result is actually stored.
 */
export const cloudEvaluationPositionAnalysisSchema = z.object({
  fen: z.string().min(1),
  normalizedFen: z.string().min(1),
  bestMoveUci: z.string().min(4).max(5),
  bestScoreCpWhite: z.number().int().nullable(),
  bestMateWhite: z.number().int().nullable(),
  lines: z.array(storedPositionAnalysisLineSchema).min(1).max(3),
  persistenceMode: z.literal('rich'),
});

export const cloudEvaluationResponseSchema = z.object({
  source: z.literal('LICHESS_CLOUD'),
  depth: z.number().int().nonnegative().nullable(),
  knodes: z.number().int().nonnegative().nullable(),
  positionAnalysis: cloudEvaluationPositionAnalysisSchema.nullable(),
});

export type CloudEvaluationPositionAnalysis = z.output<typeof cloudEvaluationPositionAnalysisSchema>;
export type CloudEvaluationResponse = z.output<typeof cloudEvaluationResponseSchema>;
