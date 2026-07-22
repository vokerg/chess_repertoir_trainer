import { z } from 'zod';

export const courseExtensionCandidatesQuerySchema = z.object({
  courseId: z.coerce.number().int().positive(),
  minGames: z.coerce.number().int().min(1).max(1000).default(4),
});

export const courseExtensionColorSchema = z.enum(['WHITE', 'BLACK']);

export const courseExtensionLineRefSchema = z.object({
  lineId: z.number().int().positive(),
  lineName: z.string(),
  chapterId: z.number().int().positive(),
  nodeId: z.number().int().positive(),
  moveSequenceSan: z.string().nullable(),
});

export const courseExtensionExampleSchema = z.object({
  gameId: z.number().int().positive(),
  provider: z.string(),
  providerGameId: z.string(),
  providerUrl: z.string().nullable(),
  endedAt: z.iso.datetime().nullable(),
  opponentUsername: z.string().nullable(),
  resultForUser: z.enum(['WIN', 'DRAW', 'LOSS']).nullable(),
  plyNumber: z.number().int().nonnegative(),
});

export const courseExtensionCandidateSchema = z.object({
  key: z.string(),
  normalizedFen: z.string(),
  sideToMove: courseExtensionColorSchema,
  userColor: courseExtensionColorSchema,
  moveUci: z.string(),
  moveSan: z.string().nullable(),
  fenAfter: z.string().nullable(),
  count: z.number().int().positive(),
  results: z.object({
    win: z.number().int().nonnegative(),
    draw: z.number().int().nonnegative(),
    loss: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
  }),
  lineRefs: z.array(courseExtensionLineRefSchema),
  examples: z.array(courseExtensionExampleSchema),
});

export const courseExtensionCandidatesResponseSchema = z.object({
  course: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().nullable(),
    lineCount: z.number().int().nonnegative(),
  }),
  filters: z.object({
    courseId: z.number().int().positive(),
    minGames: z.number().int().positive(),
  }),
  summary: z.object({
    terminalPositions: z.number().int().nonnegative(),
    gamesMatched: z.number().int().nonnegative(),
    continuationsFound: z.number().int().nonnegative(),
    qualifyingContinuations: z.number().int().nonnegative(),
  }),
  items: z.array(courseExtensionCandidateSchema),
});

export type CourseExtensionCandidatesQuery = z.infer<typeof courseExtensionCandidatesQuerySchema>;
export type CourseExtensionLineRef = z.infer<typeof courseExtensionLineRefSchema>;
export type CourseExtensionExample = z.infer<typeof courseExtensionExampleSchema>;
export type CourseExtensionCandidate = z.infer<typeof courseExtensionCandidateSchema>;
export type CourseExtensionCandidatesResponse = z.infer<typeof courseExtensionCandidatesResponseSchema>;
