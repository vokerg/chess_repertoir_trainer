import { z } from 'zod';

export const tacticalDetectionKindSchema = z.enum([
  'MISSED_SHOT',
  'PUNISHED_OPPONENT_BLUNDER',
  'USER_BLUNDER',
]);
export type TacticalDetectionKind = z.infer<typeof tacticalDetectionKindSchema>;

export const tacticalDetectionRunResponseSchema = z.object({
  runId: z.number().int().positive(),
  scannedGames: z.number().int().nonnegative(),
  skippedAlreadyProcessedGames: z.number().int().nonnegative(),
  processedGames: z.number().int().nonnegative(),
  detectionsInserted: z.number().int().nonnegative(),
  missedShots: z.number().int().nonnegative(),
  punishedOpponentBlunders: z.number().int().nonnegative(),
  userBlunders: z.number().int().nonnegative(),
});
export type TacticalDetectionRunResponse = z.infer<typeof tacticalDetectionRunResponseSchema>;

export const tacticalDetectionItemSchema = z.object({
  id: z.number().int(),
  importedGameId: z.number().int(),
  kind: tacticalDetectionKindSchema,
  triggerPlyNumber: z.number().int(),
  userReplyPlyNumber: z.number().int().nullable(),
  moveUci: z.string(),
  bestMoveUci: z.string().nullable(),
  evalBeforeUserCp: z.number().nullable(),
  evalAfterTriggerUserCp: z.number().nullable(),
  evalAfterReplyUserCp: z.number().nullable(),
  swingCp: z.number().nullable(),
  opponentUsername: z.string().nullable(),
  userColor: z.string().nullable(),
  resultForUser: z.string().nullable(),
  openingName: z.string().nullable(),
  openingEco: z.string().nullable(),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
  providerUrl: z.string().nullable(),
});
export type TacticalDetectionItem = z.infer<typeof tacticalDetectionItemSchema>;

export const tacticalDetectionListResponseSchema = z.object({
  from: z.iso.datetime({ offset: true }).nullable(),
  to: z.iso.datetime({ offset: true }).nullable(),
  limit: z.number().int().positive(),
  kind: tacticalDetectionKindSchema.nullable(),
  items: z.array(tacticalDetectionItemSchema),
});
export type TacticalDetectionListResponse = z.infer<typeof tacticalDetectionListResponseSchema>;
