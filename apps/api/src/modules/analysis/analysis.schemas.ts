import { z } from 'zod';

const defaultDepth = Number(process.env['ANALYSIS_DEFAULT_DEPTH'] || 12);
const maxDepth = Number(process.env['ANALYSIS_MAX_DEPTH'] || 16);
const defaultMultipv = Number(process.env['ANALYSIS_DEFAULT_MULTIPV'] || 3);
const maxMultipv = Number(process.env['ANALYSIS_MAX_MULTIPV'] || 3);

export const analyzeImportedGameSchema = z.object({
  depth: z.coerce.number().int().min(1).max(maxDepth).default(defaultDepth),
  multipv: z.coerce.number().int().min(1).max(maxMultipv).default(defaultMultipv),
  force: z.coerce.boolean().default(false),
});
