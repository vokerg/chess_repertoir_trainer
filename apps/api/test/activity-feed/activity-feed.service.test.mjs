import assert from 'node:assert/strict';
import {
  createActivityFeedService,
  dateOnlyInTimeZone,
  isValidIanaTimeZone,
} from '../../dist/modules/activity-feed/activity-feed.service.js';

assert.equal(isValidIanaTimeZone('Europe/Copenhagen'), true);
assert.equal(isValidIanaTimeZone('Not/A_Zone'), false);
assert.equal(
  dateOnlyInTimeZone(new Date('2026-08-04T22:30:00.000Z'), 'Europe/Copenhagen'),
  '2026-08-05',
);

const records = [
  {
    id: 1,
    userId: 7,
    activityDate: new Date('2026-08-05T00:00:00.000Z'),
    type: 'REPERTOIRE_LINES_TRAINED',
    count: 5,
    firstOccurredAt: new Date('2026-08-05T08:00:00.000Z'),
    lastOccurredAt: new Date('2026-08-05T09:00:00.000Z'),
    createdAt: new Date('2026-08-05T08:00:00.000Z'),
    updatedAt: new Date('2026-08-05T09:00:00.000Z'),
  },
  {
    id: 2,
    userId: 7,
    activityDate: new Date('2026-08-05T00:00:00.000Z'),
    type: 'GAMES_PLAYED',
    count: 1,
    firstOccurredAt: new Date('2026-08-05T07:00:00.000Z'),
    lastOccurredAt: new Date('2026-08-05T07:00:00.000Z'),
    createdAt: new Date('2026-08-05T07:00:00.000Z'),
    updatedAt: new Date('2026-08-05T07:00:00.000Z'),
  },
];
let incrementInput = null;
let incrementTransaction = null;
let reconcileInput = null;
let reconcileTransaction = null;
let updatedTimeZone = null;
let transactionCalls = 0;
const ownedTransaction = { source: 'repository' };
const repository = {
  async transaction(work) {
    transactionCalls += 1;
    return work(ownedTransaction);
  },
  async getTimeZone() { return updatedTimeZone ?? 'Europe/Copenhagen'; },
  async getTimeZoneForWrite(_userId, transaction) {
    assert.ok(transaction);
    return updatedTimeZone ?? 'Europe/Copenhagen';
  },
  async updateTimeZoneIfActivityEmpty(_userId, timeZone) {
    updatedTimeZone = timeZone;
    return timeZone;
  },
  async list(_userId, from, to) {
    return records.filter((record) => record.activityDate >= from && record.activityDate <= to);
  },
  async increment(input, transaction) {
    incrementInput = input;
    incrementTransaction = transaction;
    return {
      ...records[0],
      ...input,
      id: 3,
      count: input.amount,
      firstOccurredAt: input.occurredAt,
      lastOccurredAt: input.occurredAt,
    };
  },
  async reconcile(input, transaction) {
    reconcileInput = input;
    reconcileTransaction = transaction;
    return { ...records[0], ...input, id: 4 };
  },
};

const service = createActivityFeedService({
  repository,
  clock: () => new Date('2026-08-05T10:00:00.000Z'),
});

const today = await service.today(7);
assert.equal(today.date, '2026-08-05');
assert.deepEqual(today.activities.map((item) => item.type), [
  'GAMES_PLAYED',
  'REPERTOIRE_LINES_TRAINED',
  'LICHESS_PUZZLES_COMPLETED',
  'TACTICAL_SCENARIOS_COMPLETED',
  'GAME_ANALYSES_COMPLETED',
]);
assert.equal(today.goals.find((goal) => goal.id === 'PLAY_GAME').completed, true);
assert.equal(today.goals.find((goal) => goal.id === 'TRAIN_REPERTOIRE_LINES').completed, true);
assert.equal(today.goals.find((goal) => goal.id === 'COMPLETE_LICHESS_PUZZLES').current, 0);

const history = await service.history(7, { from: '2026-08-01', to: '2026-08-05' });
assert.equal(history.days[0].date, '2026-08-05');
assert.deepEqual(history.days[0].activities.map((item) => item.type), [
  'GAMES_PLAYED',
  'REPERTOIRE_LINES_TRAINED',
]);

await service.recordIncrement({
  userId: 7,
  type: 'LICHESS_PUZZLES_COMPLETED',
  occurredAt: new Date('2026-08-04T22:30:00.000Z'),
});
assert.equal(transactionCalls, 1);
assert.equal(incrementTransaction, ownedTransaction);
assert.equal(incrementInput.activityDate.toISOString(), '2026-08-05T00:00:00.000Z');
assert.equal(incrementInput.amount, 1);

const producerTransaction = { source: 'producer' };
await service.recordIncrement({
  userId: 7,
  type: 'GAME_ANALYSES_COMPLETED',
  occurredAt: new Date('2026-08-05T08:30:00.000Z'),
}, producerTransaction);
assert.equal(transactionCalls, 1);
assert.equal(incrementTransaction, producerTransaction);

await service.reconcileDaily({
  userId: 7,
  type: 'GAMES_PLAYED',
  activityDate: '2026-08-03',
  count: 4,
  firstOccurredAt: new Date('2026-08-03T08:00:00.000Z'),
  lastOccurredAt: new Date('2026-08-03T12:00:00.000Z'),
});
assert.equal(transactionCalls, 2);
assert.equal(reconcileTransaction, ownedTransaction);
assert.equal(reconcileInput.count, 4);
assert.equal(reconcileInput.activityDate.toISOString(), '2026-08-03T00:00:00.000Z');

await assert.rejects(
  service.reconcileDaily({
    userId: 7,
    type: 'GAMES_PLAYED',
    activityDate: '2026-08-03',
    count: 1,
    firstOccurredAt: new Date('2026-08-02T20:00:00.000Z'),
    lastOccurredAt: new Date('2026-08-02T20:00:00.000Z'),
  }),
  (error) => error.code === 'INVALID_ACTIVITY_VALUE',
);
await assert.rejects(
  service.recordIncrement({ userId: 7, type: 'CLIENT_CLICK', occurredAt: new Date() }),
  (error) => error.code === 'INVALID_ACTIVITY_TYPE',
);
await assert.rejects(
  service.updatePreferences(7, { timeZone: 'Not/A_Zone' }),
  (error) => error.code === 'INVALID_TIME_ZONE',
);
await assert.rejects(
  service.history(7, { from: '2025-01-01', to: '2026-08-05' }),
  (error) => error.code === 'ACTIVITY_RANGE_TOO_LARGE',
);

const blockedService = createActivityFeedService({
  repository: {
    ...repository,
    async updateTimeZoneIfActivityEmpty() { return null; },
  },
});
await assert.rejects(
  blockedService.updatePreferences(7, { timeZone: 'America/New_York' }),
  (error) => error.code === 'TIME_ZONE_CHANGE_REQUIRES_REBUILD',
);

console.log('Activity feed service tests passed.');
