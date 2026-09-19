import { z } from 'zod';

export const ACTIVITY_FEED_CONTRACT_VERSION = '2026-08-v1' as const;

export const activityTypeSchema = z.enum([
  'GAMES_PLAYED',
  'REPERTOIRE_LINES_TRAINED',
  'LICHESS_PUZZLES_COMPLETED',
  'TACTICAL_SCENARIOS_COMPLETED',
  'GAME_ANALYSES_COMPLETED',
]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityDateSchema = z.iso.date();
export type ActivityDate = z.infer<typeof activityDateSchema>;

export const activityHistoryQuerySchema = z.object({
  from: activityDateSchema,
  to: activityDateSchema,
}).superRefine((query, context) => {
  if (query.from > query.to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'from must not be after to',
    });
  }
});
export type ActivityHistoryQuery = z.infer<typeof activityHistoryQuerySchema>;

export const activityAggregateSchema = z.object({
  type: activityTypeSchema,
  count: z.number().int().nonnegative(),
  firstOccurredAt: z.iso.datetime({ offset: true }).nullable(),
  lastOccurredAt: z.iso.datetime({ offset: true }).nullable(),
});
export type ActivityAggregate = z.infer<typeof activityAggregateSchema>;

export const activityDaySchema = z.object({
  date: activityDateSchema,
  activities: z.array(activityAggregateSchema),
});
export type ActivityDay = z.infer<typeof activityDaySchema>;

export const activityHistoryResponseSchema = z.object({
  contractVersion: z.literal(ACTIVITY_FEED_CONTRACT_VERSION),
  timeZone: z.string().min(1),
  from: activityDateSchema,
  to: activityDateSchema,
  days: z.array(activityDaySchema),
});
export type ActivityHistoryResponse = z.infer<typeof activityHistoryResponseSchema>;

export const dailyGoalIdSchema = z.enum([
  'PLAY_GAME',
  'TRAIN_REPERTOIRE_LINES',
  'COMPLETE_LICHESS_PUZZLES',
  'COMPLETE_TACTICAL_SCENARIO',
  'COMPLETE_GAME_ANALYSIS',
]);
export type DailyGoalId = z.infer<typeof dailyGoalIdSchema>;

export const dailyGoalProgressSchema = z.object({
  id: dailyGoalIdSchema,
  activityType: activityTypeSchema,
  label: z.string().min(1),
  current: z.number().int().nonnegative(),
  target: z.number().int().positive(),
  completed: z.boolean(),
});
export type DailyGoalProgress = z.infer<typeof dailyGoalProgressSchema>;

export const todayActivityResponseSchema = z.object({
  contractVersion: z.literal(ACTIVITY_FEED_CONTRACT_VERSION),
  timeZone: z.string().min(1),
  date: activityDateSchema,
  activities: z.array(activityAggregateSchema),
  goals: z.array(dailyGoalProgressSchema),
});
export type TodayActivityResponse = z.infer<typeof todayActivityResponseSchema>;

export const activityPreferencesResponseSchema = z.object({
  contractVersion: z.literal(ACTIVITY_FEED_CONTRACT_VERSION),
  timeZone: z.string().min(1),
});
export type ActivityPreferencesResponse = z.infer<typeof activityPreferencesResponseSchema>;

export const updateActivityPreferencesSchema = z.object({
  timeZone: z.string().trim().min(1).max(64),
});
export type UpdateActivityPreferences = z.infer<typeof updateActivityPreferencesSchema>;

export const activityFeedErrorCodeSchema = z.enum([
  'ACTIVITY_RANGE_TOO_LARGE',
  'INVALID_ACTIVITY_TYPE',
  'INVALID_ACTIVITY_VALUE',
  'INVALID_TIME_ZONE',
  'TIME_ZONE_CHANGE_REQUIRES_REBUILD',
]);
export type ActivityFeedErrorCode = z.infer<typeof activityFeedErrorCodeSchema>;

export const activityFeedErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: activityFeedErrorCodeSchema,
});
export type ActivityFeedErrorResponse = z.infer<typeof activityFeedErrorResponseSchema>;
