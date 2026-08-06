import assert from 'node:assert/strict';
import {
  PLAYED_GAME_RECONCILIATION_CHUNK_DAYS,
  createPlayedGameActivityReconciliationService,
  resolveCommittedImportReconciliationRange,
} from '../../dist/modules/activity-feed/played-game-activity.service.js';

assert.deepEqual(resolveCommittedImportReconciliationRange({
  syncSince: new Date('2026-08-01T00:00:00.000Z'),
  firstPersistedEndedAt: new Date('2026-08-02T08:00:00.000Z'),
  lastPersistedEndedAt: new Date('2026-08-03T00:00:00.000Z'),
}), {
  from: new Date('2026-08-01T00:00:00.000Z'),
  to: new Date('2026-08-03T00:00:00.000Z'),
});
assert.deepEqual(resolveCommittedImportReconciliationRange({
  syncSince: new Date('2026-08-02T00:00:00.000Z'),
  firstPersistedEndedAt: new Date('2026-08-01T08:00:00.000Z'),
  lastPersistedEndedAt: new Date('2026-08-03T00:00:00.000Z'),
}), {
  from: new Date('2026-08-01T08:00:00.000Z'),
  to: new Date('2026-08-03T00:00:00.000Z'),
});
assert.deepEqual(resolveCommittedImportReconciliationRange({
  syncSince: new Date('2026-08-01T00:00:00.000Z'),
  firstPersistedEndedAt: null,
  lastPersistedEndedAt: new Date('2026-08-02T00:00:00.000Z'),
}), {
  from: new Date('2026-08-01T00:00:00.000Z'),
  to: new Date('2026-08-02T00:00:00.000Z'),
});
assert.equal(resolveCommittedImportReconciliationRange({
  syncSince: null,
  firstPersistedEndedAt: null,
  lastPersistedEndedAt: null,
}), null);

let firstDayCount = 2;
const summaryCalls = [];
const existingCalls = [];
const reconcileCalls = [];
const lockCalls = [];
const transactions = [];
const events = [];
const repository = {
  async summarizeDays(input, transaction) {
    events.push(`summary:${transaction.id}`);
    summaryCalls.push({ ...input, transaction });
    if (input.fromDate === '2026-08-01') {
      return [
        {
          activityDate: '2026-08-01',
          count: firstDayCount,
          firstOccurredAt: new Date('2026-08-01T08:00:00.000Z'),
          lastOccurredAt: new Date('2026-08-01T10:00:00.000Z'),
        },
        {
          activityDate: '2026-08-03',
          count: 1,
          firstOccurredAt: new Date('2026-08-03T12:00:00.000Z'),
          lastOccurredAt: new Date('2026-08-03T12:00:00.000Z'),
        },
      ];
    }
    return [];
  },
  async listExistingAggregateDates(_userId, fromDate, _toDate, transaction) {
    events.push(`existing:${transaction.id}`);
    existingCalls.push({ fromDate, transaction });
    return fromDate === '2026-08-01' ? ['2026-08-02'] : [];
  },
  async getHistoryBounds() {
    return {
      firstEndedAt: new Date('2026-08-01T08:00:00.000Z'),
      lastEndedAt: new Date('2026-08-03T12:00:00.000Z'),
      firstAggregateDate: new Date('2026-07-31T00:00:00.000Z'),
      lastAggregateDate: new Date('2026-08-04T00:00:00.000Z'),
    };
  },
  async listBackfillUserIds(afterUserId, limit) {
    assert.equal(afterUserId, 10);
    assert.equal(limit, 2);
    return [11, 12];
  },
};
const activityRepository = {
  async getTimeZone() { return 'Europe/Copenhagen'; },
  async getTimeZoneForWrite(_userId, transaction) {
    events.push(`lock:${transaction.id}`);
    lockCalls.push({ transaction });
    return 'Europe/Copenhagen';
  },
  async transaction(work) {
    const transaction = { id: transactions.length + 1 };
    transactions.push(transaction);
    return work(transaction);
  },
};
const activityFeed = {
  async reconcileDaily(input, transaction) {
    events.push(`reconcile:${transaction.id}`);
    reconcileCalls.push({ input, transaction });
    return { id: reconcileCalls.length, ...input };
  },
};

const service = createPlayedGameActivityReconciliationService({
  repository,
  activityRepository,
  activityFeed,
});

const first = await service.reconcileCommittedRange({
  userId: 7,
  accountId: 22,
  from: new Date('2026-07-31T22:30:00.000Z'),
  to: new Date('2026-08-03T15:00:00.000Z'),
});
assert.equal(first.fromDate, '2026-08-01');
assert.equal(first.toDate, '2026-08-03');
assert.equal(first.daysReconciled, 3);
assert.equal(first.gamesCounted, 3);
assert.equal(first.chunksProcessed, 1);
assert.deepEqual(reconcileCalls.map((call) => [
  call.input.activityDate,
  call.input.count,
]), [
  ['2026-08-01', 2],
  ['2026-08-02', 0],
  ['2026-08-03', 1],
]);
assert.equal(transactions.length, 1);
assert.equal(lockCalls[0].transaction, transactions[0]);
assert.equal(summaryCalls[0].transaction, transactions[0]);
assert.equal(existingCalls[0].transaction, transactions[0]);
assert.ok(reconcileCalls.every((call) => call.transaction === transactions[0]));
assert.deepEqual(events.slice(0, 3), ['lock:1', 'summary:1', 'existing:1']);
assert.equal(summaryCalls[0].timeZone, 'Europe/Copenhagen');
assert.ok(summaryCalls[0].fromUtc < new Date('2026-08-01T00:00:00.000Z'));
assert.ok(summaryCalls[0].toUtcExclusive > new Date('2026-08-04T00:00:00.000Z'));

reconcileCalls.length = 0;
summaryCalls.length = 0;
existingCalls.length = 0;
lockCalls.length = 0;
transactions.length = 0;
events.length = 0;
const overlapReplay = await service.reconcileCommittedRange({
  userId: 7,
  accountId: 22,
  from: new Date('2026-07-31T22:30:00.000Z'),
  to: new Date('2026-08-03T15:00:00.000Z'),
});
assert.equal(overlapReplay.gamesCounted, 3);
assert.equal(reconcileCalls.find((call) => call.input.activityDate === '2026-08-01').input.count, 2);

firstDayCount = 3;
reconcileCalls.length = 0;
summaryCalls.length = 0;
existingCalls.length = 0;
lockCalls.length = 0;
transactions.length = 0;
events.length = 0;
const additionalGame = await service.reconcileCommittedRange({
  userId: 7,
  accountId: 22,
  from: new Date('2026-07-31T22:30:00.000Z'),
  to: new Date('2026-08-03T15:00:00.000Z'),
});
assert.equal(additionalGame.gamesCounted, 4);
assert.equal(reconcileCalls.find((call) => call.input.activityDate === '2026-08-01').input.count, 3);
firstDayCount = 2;

reconcileCalls.length = 0;
summaryCalls.length = 0;
existingCalls.length = 0;
lockCalls.length = 0;
transactions.length = 0;
events.length = 0;
const longRange = await service.reconcileCommittedRange({
  userId: 7,
  accountId: 22,
  from: new Date('2026-08-01T10:00:00.000Z'),
  to: new Date('2026-09-10T10:00:00.000Z'),
});
assert.equal(PLAYED_GAME_RECONCILIATION_CHUNK_DAYS, 31);
assert.equal(longRange.daysReconciled, 3);
assert.equal(longRange.chunksProcessed, 2);
assert.equal(summaryCalls.length, 2);
assert.equal(transactions.length, 2);
assert.equal(lockCalls.length, 2);
assert.equal(summaryCalls[0].transaction, transactions[0]);
assert.equal(summaryCalls[1].transaction, transactions[1]);
assert.equal(summaryCalls[0].fromDate, '2026-08-01');
assert.equal(summaryCalls[0].toDate, '2026-08-31');
assert.equal(summaryCalls[1].fromDate, '2026-09-01');
assert.equal(summaryCalls[1].toDate, '2026-09-10');

reconcileCalls.length = 0;
summaryCalls.length = 0;
existingCalls.length = 0;
lockCalls.length = 0;
transactions.length = 0;
events.length = 0;
const backfill = await service.reconcileAllForUser(7);
assert.equal(backfill.fromDate, '2026-07-31');
assert.equal(backfill.toDate, '2026-08-04');
assert.deepEqual(await service.listBackfillUserIds(10, 2), [11, 12]);
await assert.rejects(
  service.listBackfillUserIds(0, 101),
  /between 1 and 100/,
);

let mismatchedSummaryCalled = false;
const changedTimeZoneService = createPlayedGameActivityReconciliationService({
  repository: {
    ...repository,
    async summarizeDays() {
      mismatchedSummaryCalled = true;
      return [];
    },
  },
  activityRepository: {
    ...activityRepository,
    async getTimeZoneForWrite() { return 'America/New_York'; },
  },
  activityFeed,
});
await assert.rejects(
  changedTimeZoneService.reconcileCommittedRange({
    userId: 7,
    accountId: 22,
    from: new Date('2026-08-01T08:00:00.000Z'),
    to: new Date('2026-08-01T10:00:00.000Z'),
  }),
  /time zone changed/,
);
assert.equal(mismatchedSummaryCalled, false);

console.log('Played-game activity reconciliation service tests passed.');
