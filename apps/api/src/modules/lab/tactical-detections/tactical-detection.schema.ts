import { z } from 'zod';
import { importedGameSearchQuerySchema } from '../../imported-games/imported-games.schemas';
import { tacticalDetectionThresholds } from './tactical-detection.constants';

const boolParam = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

export const tacticalDetectionKindSchema = z.enum([
  'MISSED_SHOT',
  'PUNISHED_OPPONENT_BLUNDER',
  'USER_BLUNDER',
]);

export const tacticalDetectionRunSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  force: boolParam.default(false),
});

const tacticalDetectionGameFiltersSchema = importedGameSearchQuerySchema.omit({
  sort: true,
  cursor: true,
  limit: true,
});

export const tacticalDetectionListSchema = tacticalDetectionGameFiltersSchema.extend({
  gameId: z.coerce.number().int().positive().optional(),
  kind: tacticalDetectionKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(tacticalDetectionThresholds.maxLimit)
    .default(tacticalDetectionThresholds.defaultLimit),
});

export type TacticalDetectionKind = z.infer<typeof tacticalDetectionKindSchema>;
export type TacticalDetectionRunInput = z.infer<typeof tacticalDetectionRunSchema>;
export type TacticalDetectionListQuery = z.infer<typeof tacticalDetectionListSchema>;
