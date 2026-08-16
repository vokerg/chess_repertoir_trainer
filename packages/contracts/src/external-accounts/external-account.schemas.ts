import { z } from 'zod';
import { accountPerformanceRatingSpeedSchema } from './external-account-performance.schemas';

export const externalAccountProviderSchema = z.enum(['LICHESS', 'CHESS_COM']);

export const externalAccountResponseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  provider: externalAccountProviderSchema,
  username: z.string(),
  displayName: z.string().nullable(),
  providerUserId: z.string().nullable(),
  isActive: z.boolean(),
  lastSyncAt: z.iso.datetime({ offset: true }).nullable(),
  syncCursorTime: z.iso.datetime({ offset: true }).nullable(),
  lastSyncRunId: z.number().int().positive().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  isDefaultProgressAccount: z.boolean(),
});

export const externalAccountListResponseSchema = z.array(externalAccountResponseSchema);

export const externalAccountDeleteResponseSchema = z.object({
  deleted: z.literal(true),
  account: externalAccountResponseSchema,
});

export const defaultProgressAccountResponseSchema = z.object({
  defaultProgressAccountId: z.number().int().positive().nullable(),
  account: externalAccountResponseSchema.nullable(),
  accounts: externalAccountListResponseSchema,
});

const externalAccountSummarySchema = z.object({
  id: z.number().int().positive(),
  provider: externalAccountProviderSchema,
  username: z.string(),
  displayName: z.string().nullable(),
});

export const accountRatingHistoryPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rating: z.number().int(),
  gameCount: z.number().int().nonnegative(),
  ratingAt: z.iso.datetime({ offset: true }),
});

export const accountRatingHistorySeriesSchema = z.object({
  key: accountPerformanceRatingSpeedSchema,
  label: z.enum(['Bullet', 'Blitz', 'Rapid']),
  points: z.array(accountRatingHistoryPointSchema),
});

export const accountRatingHistoryResponseSchema = z.object({
  account: externalAccountSummarySchema,
  bucket: z.literal('day'),
  aggregation: z.literal('max'),
  ratingSource: z.literal('gameRecordedRating'),
  series: z.array(accountRatingHistorySeriesSchema),
  yDomain: z.object({
    min: z.number(),
    max: z.number(),
  }).nullable(),
});

export const accountRatingStatsPeakSchema = z.object({
  rating: z.number().int(),
  ratingAt: z.iso.datetime({ offset: true }),
  gameId: z.number().int().positive(),
});

export const accountRatingStatsYearlyPeakSchema = accountRatingStatsPeakSchema.extend({
  year: z.number().int(),
});

export const accountRatingStatsMilestoneSchema = z.object({
  rating: z.number().int(),
  reachedAt: z.iso.datetime({ offset: true }),
  actualRating: z.number().int(),
  gameId: z.number().int().positive(),
});

export const accountRatingStatsSpeedProjectionSchema = z.object({
  key: accountPerformanceRatingSpeedSchema,
  label: z.enum(['Bullet', 'Blitz', 'Rapid']),
  gamesCount: z.number().int().nonnegative(),
  current: accountRatingStatsPeakSchema.nullable(),
  highest: accountRatingStatsPeakSchema.nullable(),
  yearlyHighs: z.array(accountRatingStatsYearlyPeakSchema),
  milestones: z.array(accountRatingStatsMilestoneSchema),
});

export const accountRatingStatsProjectionSchema = z.object({
  version: z.literal(3),
  ratingSource: z.literal('gameRecordedRating'),
  speeds: z.array(accountRatingStatsSpeedProjectionSchema),
});

export const accountRatingStatsResponseSchema = z.object({
  account: externalAccountSummarySchema,
  computedAt: z.iso.datetime({ offset: true }),
  gamesCount: z.number().int().nonnegative(),
  data: accountRatingStatsProjectionSchema,
});

export type ExternalAccountProvider = z.infer<typeof externalAccountProviderSchema>;
export type ExternalAccountResponse = z.infer<typeof externalAccountResponseSchema>;
export type ExternalAccountDeleteResponse = z.infer<typeof externalAccountDeleteResponseSchema>;
export type DefaultProgressAccountResponse = z.infer<typeof defaultProgressAccountResponseSchema>;
export type AccountRatingHistoryPoint = z.infer<typeof accountRatingHistoryPointSchema>;
export type AccountRatingHistorySeries = z.infer<typeof accountRatingHistorySeriesSchema>;
export type AccountRatingHistoryResponse = z.infer<typeof accountRatingHistoryResponseSchema>;
export type AccountRatingStatsPeak = z.infer<typeof accountRatingStatsPeakSchema>;
export type AccountRatingStatsYearlyPeak = z.infer<typeof accountRatingStatsYearlyPeakSchema>;
export type AccountRatingStatsMilestone = z.infer<typeof accountRatingStatsMilestoneSchema>;
export type AccountRatingStatsSpeedProjection = z.infer<
  typeof accountRatingStatsSpeedProjectionSchema
>;
export type AccountRatingStatsProjection = z.infer<typeof accountRatingStatsProjectionSchema>;
export type AccountRatingStatsResponse = z.infer<typeof accountRatingStatsResponseSchema>;
