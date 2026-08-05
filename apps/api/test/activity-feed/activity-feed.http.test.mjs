import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  activityHistoryResponseSchema,
  activityPreferencesResponseSchema,
  todayActivityResponseSchema,
} from '@chess-trainer/contracts/activity-feed';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let user = null;
let otherUser = null;

function dateOnlyInZone(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

try {
  user = await prisma.appUser.create({
    data: {
      displayName: 'Activity feed test user',
      authProvider: 'test',
      authSubject: `activity-${suffix}`,
    },
  });
  otherUser = await prisma.appUser.create({
    data: {
      displayName: 'Other activity user',
      authProvider: 'test',
      authSubject: `activity-other-${suffix}`,
    },
  });

  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: user.id },
  });
  try {
    await app.ready();

    const updatedPreferences = await app.inject({
      method: 'PUT',
      url: '/api/me/activity/preferences',
      payload: { timeZone: 'Europe/Copenhagen' },
    });
    assert.equal(updatedPreferences.statusCode, 200, updatedPreferences.body);
    assert.equal(
      activityPreferencesResponseSchema.parse(updatedPreferences.json()).timeZone,
      'Europe/Copenhagen',
    );

    const now = new Date();
    const today = dateOnlyInZone(now, 'Europe/Copenhagen');
    const day = new Date(`${today}T00:00:00.000Z`);
    await prisma.userActivityDailyAggregate.createMany({
      data: [
        {
          userId: user.id,
          activityDate: day,
          type: 'GAMES_PLAYED',
          count: 1,
          firstOccurredAt: now,
          lastOccurredAt: now,
        },
        {
          userId: otherUser.id,
          activityDate: day,
          type: 'GAMES_PLAYED',
          count: 99,
          firstOccurredAt: now,
          lastOccurredAt: now,
        },
      ],
    });

    const todayResponse = await app.inject({ method: 'GET', url: '/api/me/activity/today' });
    assert.equal(todayResponse.statusCode, 200, todayResponse.body);
    const todayBody = todayActivityResponseSchema.parse(todayResponse.json());
    assert.equal(todayBody.date, today);
    assert.equal(todayBody.activities.find((item) => item.type === 'GAMES_PLAYED').count, 1);
    assert.equal(todayBody.goals.find((goal) => goal.id === 'PLAY_GAME').completed, true);

    const historyResponse = await app.inject({
      method: 'GET',
      url: `/api/me/activity?from=${today}&to=${today}`,
    });
    assert.equal(historyResponse.statusCode, 200, historyResponse.body);
    const history = activityHistoryResponseSchema.parse(historyResponse.json());
    assert.equal(history.days.length, 1);
    assert.equal(history.days[0].activities[0].count, 1);

    const invalidZone = await app.inject({
      method: 'PUT',
      url: '/api/me/activity/preferences',
      payload: { timeZone: 'Not/A_Zone' },
    });
    assert.equal(invalidZone.statusCode, 400);
    assert.equal(invalidZone.json().code, 'INVALID_TIME_ZONE');

    const blockedChange = await app.inject({
      method: 'PUT',
      url: '/api/me/activity/preferences',
      payload: { timeZone: 'UTC' },
    });
    assert.equal(blockedChange.statusCode, 400);
    assert.equal(blockedChange.json().code, 'TIME_ZONE_CHANGE_REQUIRES_REBUILD');

    const malformedRange = await app.inject({
      method: 'GET',
      url: `/api/me/activity?from=${today}&to=not-a-date`,
    });
    assert.equal(malformedRange.statusCode, 400);
    assert.deepEqual(malformedRange.json(), { error: 'Validation failed' });
  } finally {
    await app.close();
  }

  console.log('Activity feed HTTP tests passed.');
} finally {
  if (user) await prisma.appUser.delete({ where: { id: user.id } });
  if (otherUser) await prisma.appUser.delete({ where: { id: otherUser.id } });
  await prisma.$disconnect();
}
