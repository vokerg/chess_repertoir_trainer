import { z } from 'zod';

const csv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}, z.array(z.string()).optional());

const intCsv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item));
}, z.array(z.number().int().positive()).optional());

const boolParam = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

export const importedGameSearchQuerySchema = z.object({
  accountIds: intCsv,
  providers: csv,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  resultForUser: csv,
  userColor: csv,
  rated: boolParam,
  speedCategory: csv,
  variant: csv,
  openingEco: csv,
  openingName: z.string().min(1).optional(),
  opponent: z.string().min(1).optional(),
  minUserRating: z.coerce.number().int().min(0).optional(),
  maxUserRating: z.coerce.number().int().min(0).optional(),
  minOpponentRating: z.coerce.number().int().min(0).optional(),
  maxOpponentRating: z.coerce.number().int().min(0).optional(),
  analysisStatus: csv,
  classification: csv,
  minAccuracy: z.coerce.number().min(0).max(100).optional(),
  maxAccuracy: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(['endedAtDesc', 'endedAtAsc', 'accuracyAsc']).default('endedAtDesc'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).optional(),
});

export type ImportedGameSearchQuery = z.infer<typeof importedGameSearchQuerySchema>;
