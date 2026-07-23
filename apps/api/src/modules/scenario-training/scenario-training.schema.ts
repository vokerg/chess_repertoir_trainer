import { z } from 'zod';

export const tacticalScenarioStartSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  gameId: z.coerce.number().int().positive().optional(),
  detectionId: z.coerce.number().int().positive().optional(),
  excludeDetectionId: z.coerce.number().int().positive().optional(),
  random: z.boolean().optional(),
  excludePassedRecently: z.boolean().optional(),
});

export const tacticalMissedShotStartSchema = tacticalScenarioStartSchema;

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

export const scenarioTrainingDislikeSchema = z.object({
  reason: z.string().max(200).optional(),
});

export type TacticalScenarioStartInput = z.infer<typeof tacticalScenarioStartSchema>;
export type TacticalMissedShotStartInput = TacticalScenarioStartInput;
export type ScenarioTrainingAttemptInput = z.infer<typeof scenarioTrainingAttemptSchema>;
export type ScenarioTrainingDislikeInput = z.infer<typeof scenarioTrainingDislikeSchema>;
