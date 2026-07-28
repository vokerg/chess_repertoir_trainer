import { z } from 'zod';

export const RATING_POOLS = [
  'CHESS_COM_BLITZ',
  'CHESS_COM_BULLET',
  'CHESS_COM_RAPID',
  'LICHESS_BLITZ',
  'LICHESS_BULLET',
  'LICHESS_RAPID',
  'FIDE_STANDARD',
] as const;

export const ONLINE_RATING_POOLS = [
  'CHESS_COM_BLITZ',
  'CHESS_COM_BULLET',
  'CHESS_COM_RAPID',
  'LICHESS_BLITZ',
  'LICHESS_BULLET',
  'LICHESS_RAPID',
] as const;

export const ratingPoolSchema = z.enum(RATING_POOLS);
export const ratingNormalizationConfidenceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const ratingNormalizationSourceRoleSchema = z.enum(['EMPIRICAL', 'PRODUCT_ADJUSTMENT']);

export const ratingRangeSchema = z.object({
  minInclusive: z.number().int().nonnegative(),
  maxExclusive: z.number().int().positive().nullable(),
}).superRefine((range, context) => {
  if (range.maxExclusive !== null && range.maxExclusive <= range.minInclusive) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxExclusive'],
      message: 'maxExclusive must be greater than minInclusive',
    });
  }
});

const nullableRatingRangeSchema = ratingRangeSchema.nullable();

export const ratingRangesSchema = z.object({
  CHESS_COM_BLITZ: nullableRatingRangeSchema,
  CHESS_COM_BULLET: nullableRatingRangeSchema,
  CHESS_COM_RAPID: nullableRatingRangeSchema,
  LICHESS_BLITZ: nullableRatingRangeSchema,
  LICHESS_BULLET: nullableRatingRangeSchema,
  LICHESS_RAPID: nullableRatingRangeSchema,
  FIDE_STANDARD: nullableRatingRangeSchema,
});

export const ratingPoolMetadataSchema = z.object({
  label: z.string().min(1),
  referenceOnly: z.boolean(),
  confidence: ratingNormalizationConfidenceSchema,
  softPadding: z.number().int().nonnegative(),
});

export const ratingPoolMetadataMapSchema = z.object({
  CHESS_COM_BLITZ: ratingPoolMetadataSchema,
  CHESS_COM_BULLET: ratingPoolMetadataSchema,
  CHESS_COM_RAPID: ratingPoolMetadataSchema,
  LICHESS_BLITZ: ratingPoolMetadataSchema,
  LICHESS_BULLET: ratingPoolMetadataSchema,
  LICHESS_RAPID: ratingPoolMetadataSchema,
  FIDE_STANDARD: ratingPoolMetadataSchema,
});

export const ratingNormalizationSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  role: ratingNormalizationSourceRoleSchema,
  note: z.string().min(1).optional(),
});

export const ratingGradeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1),
  order: z.number().int().nonnegative(),
  ranges: ratingRangesSchema,
});

export const ratingNormalizationProfileSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  baseline: ratingPoolSchema,
  pools: ratingPoolMetadataMapSchema,
  sources: z.array(ratingNormalizationSourceSchema).min(1),
  grades: z.array(ratingGradeSchema).min(1),
}).superRefine((profile, context) => {
  if (profile.pools[profile.baseline].referenceOnly) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['baseline'],
      message: 'The baseline pool cannot be reference-only',
    });
  }

  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const [index, grade] of profile.grades.entries()) {
    if (ids.has(grade.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grades', index, 'id'],
        message: `Duplicate grade id: ${grade.id}`,
      });
    }
    ids.add(grade.id);

    if (orders.has(grade.order)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grades', index, 'order'],
        message: `Duplicate grade order: ${grade.order}`,
      });
    }
    orders.add(grade.order);
  }

  const orderedGrades = [...profile.grades].sort((left, right) => left.order - right.order);
  orderedGrades.forEach((grade, index) => {
    if (grade.order !== index) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grades', profile.grades.indexOf(grade), 'order'],
        message: 'Grade orders must be contiguous and start at zero',
      });
    }
  });

  for (const pool of RATING_POOLS) {
    const referenceOnly = profile.pools[pool].referenceOnly;
    const ranges = orderedGrades.map((grade) => grade.ranges[pool]);
    const firstRangeIndex = ranges.findIndex((range) => range !== null);

    if (firstRangeIndex === -1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grades'],
        message: `${pool} must have at least one calibrated range`,
      });
      continue;
    }

    if (!referenceOnly && firstRangeIndex !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grades', firstRangeIndex, 'ranges', pool],
        message: `${pool} must cover every grade`,
      });
    }

    let expectedMin: number | null = referenceOnly ? null : 0;
    for (let index = firstRangeIndex; index < ranges.length; index += 1) {
      const range = ranges[index];
      if (range === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['grades', index, 'ranges', pool],
          message: `${pool} ranges cannot contain gaps after calibration starts`,
        });
        continue;
      }

      if (expectedMin !== null && range.minInclusive !== expectedMin) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['grades', index, 'ranges', pool, 'minInclusive'],
          message: `${pool} ranges must be contiguous`,
        });
      }

      if (index < ranges.length - 1 && range.maxExclusive === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['grades', index, 'ranges', pool, 'maxExclusive'],
          message: `${pool} can only be open-ended in the final grade`,
        });
      }

      expectedMin = range.maxExclusive;
    }

    const finalRange = ranges.at(-1);
    if (!finalRange || finalRange.maxExclusive !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grades', ranges.length - 1, 'ranges', pool, 'maxExclusive'],
        message: `${pool} final range must be open-ended`,
      });
    }
  }
});

export type RatingPool = z.infer<typeof ratingPoolSchema>;
export type RatingRange = z.infer<typeof ratingRangeSchema>;
export type RatingPoolMetadata = z.infer<typeof ratingPoolMetadataSchema>;
export type RatingGrade = z.infer<typeof ratingGradeSchema>;
export type RatingNormalizationProfile = z.infer<typeof ratingNormalizationProfileSchema>;
