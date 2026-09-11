export const DAILY_REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;
export const DAILY_REVIEW_MAX_STAGE = DAILY_REVIEW_INTERVAL_DAYS.length - 1;

const DAY_MS = 24 * 60 * 60 * 1000;

export function addReviewDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

export function nextSuccessfulReview(
  current: { intervalStage: number; consecutiveSuccesses: number },
  now: Date,
): { intervalStage: number; consecutiveSuccesses: number; dueAt: Date } {
  const intervalStage = Math.min(Math.max(current.intervalStage, 0) + 1, DAILY_REVIEW_MAX_STAGE);
  return {
    intervalStage,
    consecutiveSuccesses: current.consecutiveSuccesses + 1,
    dueAt: addReviewDays(now, DAILY_REVIEW_INTERVAL_DAYS[intervalStage]),
  };
}

export function nextFailedReview(now: Date): {
  intervalStage: 0;
  consecutiveSuccesses: 0;
  dueAt: Date;
} {
  return { intervalStage: 0, consecutiveSuccesses: 0, dueAt: addReviewDays(now, 1) };
}
