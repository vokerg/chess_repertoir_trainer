import { z } from 'zod';

export const tacticalMissedShotStartSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  detectionId: z.coerce.number().int().positive().optional(),
  random: z.boolean().optional(),
  excludePassedRecently: z.boolean().optional(),
});

export const scenarioTrainingAttemptSchema = z.object({
  moveUci: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
  fenAfter: z.string().min(8),
  engineSource: z.literal('CLIENT_STOCKFISH'),
  engineName: z.string().min(1).max(100).optional(),
  engineDepth: z.number().int().min(1).max(40),
  engineMultipv: z.number().int().min(1).max(10),
  baselineScoreCpWhite: z.number().int().nullable().optional(),
  baselineMateWhite: z.number().int().nullable().optional(),
  afterScoreCpWhite: z.number().int().nullable().optional(),
  afterMateWhite: z.number().int().nullable().optional(),
  rawEngineJson: z.unknown().optional(),
});

export type TacticalMissedShotStartInput = z.infer<typeof tacticalMissedShotStartSchema>;
export type ScenarioTrainingAttemptInput = z.infer<typeof scenarioTrainingAttemptSchema>;
