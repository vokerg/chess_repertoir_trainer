import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  ActivityFeedRepository,
} from '../../dist/modules/activity-feed/activity-feed.repository.prisma.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let user = null;

try {
  user = await prisma.appUser.create({
    data: {
      displayName: 'Activity repository test user',
      authProvider: 'test',
      authSubject: `activity-repository-${suffix}`,
      timeZone: 'Europe/Copenhagen',
    },
  });

  const activityDate = new Date('2026-08-05T00:00:00.000Z');
  const occurrences = [
    '2026-08-05T06:00:00.000Z',
    '2026-08-05T07:00:00.000Z',
    '2026-08-05T08:00:00.000Z',
    '2026-08-05T09:00:00.000Z',
    '2026-08-05T10:00:00.000Z',
    '2026-08-05T11:00:00.000Z',
  ].map((value) => new Date(value));

  await Promise.all(occurrences.map((occurredAt) => (
    ActivityFeedRepository.transaction(async (transaction) => {
      const timeZone = await ActivityFeedRepository.getTimeZoneForWrite(user.id, transaction);
      assert.equal(timeZone, 'Europe/Copenhagen');
      return ActivityFeedRepository.increment({
        userId: user.id,
        activityDate,
        type: 'LICHESS_PUZZLES_COMPLETED',
        amount: 1,
        occurredAt,
      }, transaction);
    })
  )));

  const rows = await prisma.userActivityDailyAggregate.findMany({
    where: {
      userId: user.id,
      activityDate,
      type: 'LICHESS_PUZZLES_COMPLETED',
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, occurrences.length);
  assert.equal(rows[0].firstOccurredAt.toISOString(), occurrences[0].toISOString());
  assert.equal(rows[0].lastOccurredAt.toISOString(), occurrences.at(-1).toISOString());

  const reconciled = await ActivityFeedRepository.transaction(async (transaction) => {
    await ActivityFeedRepository.getTimeZoneForWrite(user.id, transaction);
    return ActivityFeedRepository.reconcile({
      userId: user.id,
      activityDate,
      type: 'GAMES_PLAYED',
      count: 4,
      firstOccurredAt: new Date('2026-08-05T07:00:00.000Z'),
      lastOccurredAt: new Date('2026-08-05T12:00:00.000Z'),
    }, transaction);
  });
  assert.equal(reconciled.count, 4);
  assert.equal(reconciled.firstOccurredAt.toISOString(), '2026-08-05T07:00:00.000Z');
  assert.equal(reconciled.lastOccurredAt.toISOString(), '2026-08-05T12:00:00.000Z');

  const reconciledAgain = await ActivityFeedRepository.transaction(async (transaction) => {
    await ActivityFeedRepository.getTimeZoneForWrite(user.id, transaction);
    return ActivityFeedRepository.reconcile({
      userId: user.id,
      activityDate,
      type: 'GAMES_PLAYED',
      count: 2,
      firstOccurredAt: new Date('2026-08-05T08:00:00.000Z'),
      lastOccurredAt: new Date('2026-08-05T09:00:00.000Z'),
    }, transaction);
  });
  assert.equal(reconciledAgain.id, reconciled.id);
  assert.equal(reconciledAgain.count, 2);

  assert.equal(
    await ActivityFeedRepository.updateTimeZoneIfActivityEmpty(user.id, 'America/New_York'),
    null,
  );
  assert.equal(await ActivityFeedRepository.getTimeZone(user.id), 'Europe/Copenhagen');

  console.log('Activity feed repository tests passed.');
} finally {
  if (user) await prisma.appUser.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}
