import { z } from 'zod';

export const analysisMergeMoveSchema: z.ZodType<
  { moveUci: string; children: any[] },
  z.ZodTypeDef,
  { moveUci: string; children?: any[] }
> = z.lazy(() =>
  z.object({ moveUci: z.string().min(4).max(5), children: z.array(analysisMergeMoveSchema).default([]) }),
);

export const analysisMergeTreeSchema = z.object({
  rootFen: z.string().min(1),
  children: z.array(analysisMergeMoveSchema).default([]),
});

export const previewAnalysisReintegrationSchema = z.object({
  analysisTree: analysisMergeTreeSchema,
  newLineName: z.string().min(1).optional(),
  newLineSideToTrain: z.enum(['WHITE', 'BLACK']).optional(),
});

export const applyAnalysisReintegrationSchema = z.object({
  analysisTree: analysisMergeTreeSchema,
  target: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('EXISTING_LINE'), lineId: z.number().int().positive(),
      anchor: z.object({ kind: z.enum(['LINE_START', 'NODE']),
        nodeId: z.number().int().positive().nullable(), normalizedFen: z.string().min(1) }),
      allowConflicts: z.literal(false).optional().default(false) }),
    z.object({ kind: z.literal('NEW_LINE'), name: z.string().min(1),
      sideToTrain: z.enum(['WHITE', 'BLACK']),
      allowConflicts: z.boolean().optional().default(false) }),
  ]),
});

export type PreviewAnalysisReintegrationInput = z.infer<typeof previewAnalysisReintegrationSchema>;
export type ApplyAnalysisReintegrationInput = z.infer<typeof applyAnalysisReintegrationSchema>;
