import { z } from 'zod';

export const scenarioTrainingScenarioTypeSchema = z.enum([
  'MISSED_OPPORTUNITY',
  'BLUNDER_AVOIDANCE',
]);
export type ScenarioTrainingScenarioType = z.infer<typeof scenarioTrainingScenarioTypeSchema>;

export const scenarioTrainingSourceTypeSchema = z.literal('TACTICAL_DETECTION');
export type ScenarioTrainingSourceType = z.infer<typeof scenarioTrainingSourceTypeSchema>;

export const scenarioTrainingColorSchema = z.enum(['WHITE', 'BLACK']);
export type ScenarioTrainingColor = z.infer<typeof scenarioTrainingColorSchema>;

export const scenarioTrainingStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETED']);
export type ScenarioTrainingStatus = z.infer<typeof scenarioTrainingStatusSchema>;

export const scenarioContextPlySchema = z.object({
  plyNumber: z.number().int().positive(),
  moveNumber: z.number().int().positive(),
  moveUci: z.string(),
  moveSan: z.string().nullable(),
  fenBefore: z.string(),
  fenAfter: z.string(),
  isUserMove: z.boolean(),
});
export type ScenarioContextPly = z.infer<typeof scenarioContextPlySchema>;

export const scenarioTrainingAttemptResponseSchema = z.object({
  id: z.number().int().positive(),
  sessionId: z.number().int().positive(),
  attemptNumber: z.number().int().positive(),
  fenBefore: z.string(),
  playedMoveUci: z.string(),
  playedMoveSan: z.string().nullable(),
  fenAfter: z.string(),
  baselineUserEvalCp: z.number().int().nullable(),
  afterUserEvalCp: z.number().int().nullable(),
  deltaCp: z.number().int().nullable(),
  passed: z.boolean(),
  engineSource: z.literal('CLIENT_STOCKFISH'),
  engineName: z.string().nullable(),
  engineDepth: z.number().int().positive(),
  engineMultipv: z.number().int().positive(),
  rawEngineJson: z.json(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ScenarioTrainingAttempt = z.infer<typeof scenarioTrainingAttemptResponseSchema>;

export const scenarioTrainingSessionResponseSchema = z.object({
  id: z.number().int().positive(),
  sessionId: z.number().int().positive(),
  scenarioType: scenarioTrainingScenarioTypeSchema,
  sourceType: scenarioTrainingSourceTypeSchema,
  sourceId: z.number().int().positive(),
  importedGameId: z.number().int().positive().nullable(),
  whiteUsername: z.string().nullable(),
  blackUsername: z.string().nullable(),
  whiteRating: z.number().int().nullable(),
  blackRating: z.number().int().nullable(),
  userColor: scenarioTrainingColorSchema,
  opponentUsername: z.string().nullable(),
  resultForUser: z.string().nullable(),
  gameResult: z.string().nullable(),
  openingEco: z.string().nullable(),
  openingName: z.string().nullable(),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
  providerUrl: z.string().nullable(),
  previousFen: z.string().nullable(),
  startFen: z.string(),
  challengePlyNumber: z.number().int().positive(),
  triggerMoveUci: z.string().nullable(),
  triggerMoveSan: z.string().nullable(),
  originalUserMoveUci: z.string().nullable(),
  originalUserMoveSan: z.string().nullable(),
  referenceBestMoveUci: z.string().nullable(),
  contextPlies: z.array(scenarioContextPlySchema),
  baselineUserEvalCp: z.number().int().nullable(),
  passToleranceCp: z.number().int().nonnegative(),
  status: scenarioTrainingStatusSchema,
  startedAt: z.iso.datetime({ offset: true }),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  attempts: z.array(scenarioTrainingAttemptResponseSchema),
});
export type ScenarioTrainingSession = z.infer<typeof scenarioTrainingSessionResponseSchema>;

export const scenarioAttemptResultResponseSchema = z.object({
  passed: z.boolean(),
  baselineUserEvalCp: z.number().int().nullable(),
  afterUserEvalCp: z.number().int().nullable(),
  deltaCp: z.number().int().nullable(),
  session: scenarioTrainingSessionResponseSchema,
});
export type ScenarioAttemptResult = z.infer<typeof scenarioAttemptResultResponseSchema>;

export const scenarioTrainingHistoryResponseSchema = z.object({
  items: z.array(scenarioTrainingSessionResponseSchema),
});
export type ScenarioTrainingHistoryResponse = z.infer<typeof scenarioTrainingHistoryResponseSchema>;

export const scenarioTrainingDislikeResponseSchema = z.object({
  disliked: z.literal(true),
});
export type ScenarioTrainingDislikeResponse = z.infer<typeof scenarioTrainingDislikeResponseSchema>;
