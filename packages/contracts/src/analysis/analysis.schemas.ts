import { z } from 'zod';
import { importedGameTagsRefreshResponseSchema } from '../imported-games/imported-games.schemas';

export const storedPositionAnalysisLineSchema = z.object({
  multipv: z.number().int().optional(),
  depth: z.number().int().optional(),
  moveUci: z.string().optional(),
  scoreCpWhite: z.number().optional(),
  mateWhite: z.number().optional(),
  pvUci: z.array(z.string()),
});

export const storedPositionAnalysisSchema = z.object({
  id: z.number().int().positive(),
  positionId: z.number().int().positive(),
  fen: z.string().optional(),
  normalizedFen: z.string(),
  bestMoveUci: z.string().optional(),
  bestScoreCpWhite: z.number().optional(),
  bestMateWhite: z.number().optional(),
  lines: z.array(storedPositionAnalysisLineSchema),
  fromCache: z.boolean(),
});

export const positionAnalysisLookupResponseSchema = z.object({
  positionAnalysis: storedPositionAnalysisSchema.nullable(),
});

export const positionAnalysisBulkResponseSchema = z.object({
  positionAnalyses: z.array(storedPositionAnalysisSchema),
});

export const positionAnalysisStoreResponseSchema = z.object({
  positionAnalysis: storedPositionAnalysisSchema,
  position: storedPositionAnalysisSchema,
});

export const importedGameAnalysisMoveResponseSchema = z.object({
  plyNumber: z.number().int().positive(),
  moveNumber: z.number().int().positive(),
  side: z.enum(['WHITE', 'BLACK']),
  playedMoveUci: z.string(),
  playedMoveSan: z.string().nullable(),
  classificationCode: z.number().int().nullable(),
  classification: z.string(),
  scoreLossCp: z.number().nullable(),
  bestMoveUci: z.string().nullable(),
  bestScoreCpWhite: z.number().nullable(),
  playedScoreCpWhite: z.number().nullable(),
  bestMateWhite: z.number().nullable(),
  positionAnalysisId: z.number().int().positive().nullable(),
});

export const importedGameAnalysisRunStatusSchema = z.enum(['RUNNING', 'COMPLETED', 'FAILED']);

export const importedGameAnalysisRunResponseSchema = z.object({
  id: z.number().int().positive(),
  importedGameId: z.number().int().positive(),
  status: importedGameAnalysisRunStatusSchema,
  positionsTotal: z.number().int().nonnegative().nullable(),
  positionsDone: z.number().int().nonnegative().nullable(),
  accuracyVersion: z.string().nullable(),
  whiteAccuracy: z.number().nullable(),
  blackAccuracy: z.number().nullable(),
  whiteAverageCentipawnLoss: z.number().nullable(),
  blackAverageCentipawnLoss: z.number().nullable(),
  whiteMovesAnalyzed: z.number().int().nonnegative().nullable(),
  blackMovesAnalyzed: z.number().int().nonnegative().nullable(),
  summary: z.unknown().nullable(),
  error: z.string().nullable(),
  startedAt: z.iso.datetime({ offset: true }).nullable(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }).nullable(),
  moves: z.array(importedGameAnalysisMoveResponseSchema),
});

export const importedGameAnalysisResponseSchema = z.object({
  run: importedGameAnalysisRunResponseSchema,
});

export const importedGameClientAnalysisResponseSchema = z.object({
  reusedExisting: z.boolean(),
  run: importedGameAnalysisRunResponseSchema,
  tags: importedGameTagsRefreshResponseSchema,
});

export const importedGamePlyAnalysisUpdateResponseSchema = z.object({
  importedGameId: z.number().int().positive(),
  updatedPlies: z.number().int().nonnegative(),
});

export const importedGamePlyAnalysisClearResponseSchema = z.object({
  importedGameId: z.number().int().positive(),
  clearedPlies: z.number().int().nonnegative(),
});

export type StoredPositionAnalysisLine = z.output<typeof storedPositionAnalysisLineSchema>;
export type StoredPositionAnalysis = z.output<typeof storedPositionAnalysisSchema>;
export type PositionAnalysisLookupResponse = z.output<typeof positionAnalysisLookupResponseSchema>;
export type PositionAnalysisBulkResponse = z.output<typeof positionAnalysisBulkResponseSchema>;
export type PositionAnalysisStoreResponse = z.output<typeof positionAnalysisStoreResponseSchema>;
export type ImportedGameAnalysisMove = z.output<typeof importedGameAnalysisMoveResponseSchema>;
export type ImportedGameAnalysisRunStatus = z.output<typeof importedGameAnalysisRunStatusSchema>;
export type ImportedGameAnalysisRun = z.output<typeof importedGameAnalysisRunResponseSchema>;
export type ImportedGameAnalysisResponse = z.output<typeof importedGameAnalysisResponseSchema>;
export type ImportedGameClientAnalysisResponse = z.output<typeof importedGameClientAnalysisResponseSchema>;
export type ImportedGamePlyAnalysisUpdateResponse = z.output<typeof importedGamePlyAnalysisUpdateResponseSchema>;
export type ImportedGamePlyAnalysisClearResponse = z.output<typeof importedGamePlyAnalysisClearResponseSchema>;
