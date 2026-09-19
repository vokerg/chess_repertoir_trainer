import assert from 'node:assert/strict';
import {
  ACTIVITY_FEED_CONTRACT_VERSION,
  activityHistoryQuerySchema,
  activityHistoryResponseSchema,
  activityTypeSchema,
  todayActivityResponseSchema,
  updateActivityPreferencesSchema,
} from '../dist/activity-feed/index.js';

assert.equal(activityTypeSchema.safeParse('GAMES_PLAYED').success, true);
assert.equal(activityTypeSchema.safeParse('ARBITRARY_CLIENT_EVENT').success, false);
assert.equal(
  activityHistoryQuerySchema.safeParse({ from: '2026-08-01', to: '2026-08-05' }).success,
  true,
);
assert.equal(
  activityHistoryQuerySchema.safeParse({ from: '2026-08-05', to: '2026-08-01' }).success,
  false,
);
assert.equal(updateActivityPreferencesSchema.safeParse({ timeZone: 'Europe/Copenhagen' }).success, true);

const history = activityHistoryResponseSchema.parse({
  contractVersion: ACTIVITY_FEED_CONTRACT_VERSION,
  timeZone: 'Europe/Copenhagen',
  from: '2026-08-01',
  to: '2026-08-05',
  days: [{
    date: '2026-08-05',
    activities: [{
      type: 'GAMES_PLAYED',
      count: 2,
      firstOccurredAt: '2026-08-05T08:00:00.000Z',
      lastOccurredAt: '2026-08-05T09:00:00.000Z',
    }],
  }],
});
assert.equal(history.days[0].activities[0].count, 2);

const today = todayActivityResponseSchema.parse({
  contractVersion: ACTIVITY_FEED_CONTRACT_VERSION,
  timeZone: 'UTC',
  date: '2026-08-05',
  activities: [],
  goals: [{
    id: 'PLAY_GAME',
    activityType: 'GAMES_PLAYED',
    label: 'Play a game',
    current: 1,
    target: 1,
    completed: true,
  }],
});
assert.equal(today.goals[0].completed, true);

console.log('Activity feed contract tests passed.');
