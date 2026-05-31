import { z } from 'zod';

const defaultDepth = Number(process.env['ANALYSIS_DEFAULT_DEPTH'] || 12);
const maxDepth = Number(process.env['ANALYSIS_MAX_DEPTH'] || 16);
const defaultMultipv = Number(process.env['ANALYSIS_DEFAULT_MULTIPV'] || 1);
const maxMultipv = Number(process.env['ANALYSIS_MAX_MULTIPV'] || 3);
const defaultPositionMultipv = Math.min(3, maxMultipv);

export const analyzeImportedGameSchema = z.object({
  depth: z.coerce.number().int().min(1).max(maxDepth).default(defaultDepth),
  multipv: z.coerce.number().int().min(1).max(maxMultipv).default(defaultMultipv),
  force: z.coerce.boolean().default(false),
});

export const analyzePositionSchema = z.object({
  fen: z.string().min(1),
  depth: z.coerce.number().int().min(1).max(maxDepth).default(defaultDepth),
  multipv: z.coerce.number().int().min(1).max(maxMultipv).default(defaultPositionMultipv),
});

const engineLineSchema = z.object({
  multipv: z.coerce.number().int().min(1).max(maxMultipv),
  depth: z.coerce.number().int().min(1).max(maxDepth),
  moveUci: z.string().min(4).max(5).optional(),
  scoreCpWhite: z.coerce.number().int().optional(),
  mateWhite: z.coerce.number().int().optional(),
  pvUci: z.array(z.string().min(4).max(5)).min(1),
});

export const storePositionAnalysisSchema = z.object({
  fen: z.string().min(1),
  depth: z.coerce.number().int().min(1).max(maxDepth).default(defaultDepth),
  multipv: z.coerce.number().int().min(1).max(maxMultipv).default(defaultPositionMultipv),
  bestMoveUci: z.string().min(4).max(5).optional(),
  engineName: z.string().min(1).max(120).default('stockfish-web'),
  engineVersion: z.string().min(1).max(120).default('18.0.7'),
  lines: z.array(engineLineSchema).min(1),
});
