import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  accountRatingHistoryResponseSchema,
  accountRatingStatsResponseSchema,
  defaultProgressAccountResponseSchema,
  externalAccountDeleteResponseSchema,
  externalAccountListResponseSchema,
  externalAccountResponseSchema,
} from '@chess-trainer/contracts/external-accounts';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;

const account = {
  id: 17,
  userId: 3,
  provider: 'LICHESS',
  username: 'contract-player',
  displayName: null,
  providerUserId: 'lichess-17',
  isActive: true,
  lastSyncAt: '2026-08-14T18:00:00.000Z',
  syncCursorTime: null,
  lastSyncRunId: 91,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-14T18:00:00.000Z',
  isDefaultProgressAccount: true,
};

const ratingHistory = {
  account: {
    id: account.id,
    provider: account.provider,
    username: account.username,
    displayName: account.displayName,
  },
  bucket: 'day',
  aggregation: 'max',
  ratingSource: 'gameRecordedRating',
  series: [
    {
      key: 'blitz',
      label: 'Blitz',
      points: [
        {
          date: '2026-08-14',
          rating: 1812,
          gameCount: 3,
          ratingAt: '2026-08-14T20:15:00.000Z',
        },
      ],
    },
  ],
  yDomain: { min: 1787, max: 1837 },
};

const ratingStats = {
  account: ratingHistory.account,
  computedAt: '2026-08-14T20:20:00.000Z',
  gamesCount: 12,
  data: {
    version: 3,
    ratingSource: 'gameRecordedRating',
    speeds: [
      {
        key: 'blitz',
        label: 'Blitz',
        gamesCount: 12,
        current: {
          rating: 1812,
          ratingAt: '2026-08-14T20:15:00.000Z',
          gameId: 500,
        },
        highest: {
          rating: 1840,
          ratingAt: '2026-08-10T19:00:00.000Z',
          gameId: 450,
        },
        yearlyHighs: [
          {
            year: 2026,
            rating: 1840,
            ratingAt: '2026-08-10T19:00:00.000Z',
            gameId: 450,
          },
        ],
        milestones: [
          {
            rating: 1800,
            reachedAt: '2026-08-02T16:00:00.000Z',
            actualRating: 1804,
            gameId: 401,
          },
        ],
      },
    ],
  },
};

assert.deepEqual(externalAccountResponseSchema.parse(account), account);
assert.deepEqual(externalAccountListResponseSchema.parse([account]), [account]);
assert.deepEqual(
  defaultProgressAccountResponseSchema.parse({
    defaultProgressAccountId: account.id,
    account,
    accounts: [account],
  }),
  { defaultProgressAccountId: account.id, account, accounts: [account] },
);
assert.deepEqual(
  defaultProgressAccountResponseSchema.parse({
    defaultProgressAccountId: null,
    account: null,
    accounts: [account],
  }),
  { defaultProgressAccountId: null, account: null, accounts: [account] },
);
assert.deepEqual(
  externalAccountDeleteResponseSchema.parse({ deleted: true, account }),
  { deleted: true, account },
);
assert.deepEqual(accountRatingHistoryResponseSchema.parse(ratingHistory), ratingHistory);
assert.deepEqual(accountRatingStatsResponseSchema.parse(ratingStats), ratingStats);

assert.equal(
  externalAccountResponseSchema.safeParse({ ...account, lastSyncAt: new Date() }).success,
  false,
  'Prisma Date values must be serialized before crossing the HTTP boundary',
);
const { userId: _userId, ...accountWithoutUserId } = account;
assert.equal(
  externalAccountResponseSchema.safeParse(accountWithoutUserId).success,
  false,
  'persisted account scalar fields are required on the current wire response',
);
assert.equal(
  externalAccountResponseSchema.safeParse({ ...account, provider: 'OTHER' }).success,
  false,
  'provider must stay within the supported account literals',
);
assert.equal(
  externalAccountDeleteResponseSchema.safeParse({ deleted: false, account }).success,
  false,
  'delete acknowledgement is the literal true success response',
);
assert.equal(
  accountRatingHistoryResponseSchema.safeParse({ ...ratingHistory, bucket: 'week' }).success,
  false,
  'rating-history aggregation literals are part of the stable wire contract',
);
assert.equal(
  accountRatingStatsResponseSchema.safeParse({
    ...ratingStats,
    data: { ...ratingStats.data, version: 4 },
  }).success,
  false,
  'rating-stats public projection version remains explicit',
);

await verifyOpenApi();
await verifyHttpBoundary();

console.log('External-account response contract tests passed.');

async function verifyOpenApi() {
  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: 1 },
    prisma: { $disconnect: async () => {} },
  });

  try {
    await app.ready();
    const document = app.swagger();
    const served = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });
    assert.equal(served.statusCode, 200);
    const servedDocument = served.json();

    const operations = [
      ['GET', '/api/me/accounts', '200', 'listExternalAccounts'],
      ['POST', '/api/me/accounts', '201', 'createExternalAccount'],
      ['PATCH', '/api/me/default-progress-account', '200', 'setDefaultProgressAccount'],
      ['GET', '/api/me/accounts/{id}', '200', 'getExternalAccount'],
      ['GET', '/api/me/accounts/{id}/rating-history', '200', 'getExternalAccountRatingHistory'],
      ['GET', '/api/me/accounts/{id}/rating-stats', '200', 'getExternalAccountRatingStats'],
      ['PATCH', '/api/me/accounts/{id}', '200', 'updateExternalAccount'],
      ['DELETE', '/api/me/accounts/{id}', '200', 'deleteExternalAccount'],
    ];

    for (const [method, path, status, operationId] of operations) {
      const key = method.toLowerCase();
      assert.equal(document.paths[path][key].operationId, operationId);
      assert.equal(servedDocument.paths[path][key].operationId, operationId);
      assert.ok(document.paths[path][key].responses[status].content['application/json'].schema);
    }

    const accountListSchema = resolveSchema(
      document,
      document.paths['/api/me/accounts'].get.responses['200'].content['application/json'].schema,
    );
    assert.equal(accountListSchema.type, 'array');
    const accountItemSchema = resolveSchema(document, accountListSchema.items);
    assert.ok(accountItemSchema.properties?.provider);
    assert.ok(accountItemSchema.properties?.lastSyncAt);

    const ratingHistorySchema = resolveSchema(
      document,
      document.paths['/api/me/accounts/{id}/rating-history'].get.responses['200'].content['application/json'].schema,
    );
    assert.ok(ratingHistorySchema.properties?.series);
    assert.ok(ratingHistorySchema.properties?.ratingSource);

    const deleteSchema = resolveSchema(
      document,
      document.paths['/api/me/accounts/{id}'].delete.responses['200'].content['application/json'].schema,
    );
    assert.ok(deleteSchema.properties?.deleted);
    assert.ok(deleteSchema.properties?.account);
  } finally {
    await app.close();
  }
}

async function verifyHttpBoundary() {
  const suffix = randomUUID();
  const user = await prisma.appUser.create({
    data: {
      displayName: 'External-account contract HTTP user',
      authProvider: 'test',
      authSubject: `external-account-contract-${suffix}`,
    },
  });

  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: user.id },
  });

  try {
    await app.ready();

    const username = `contract-${suffix}`;
    const createdResponse = await app.inject({
      method: 'POST',
      url: '/api/me/accounts',
      payload: {
        provider: 'CHESS_COM',
        username,
        displayName: 'HTTP contract player',
      },
    });
    assert.equal(createdResponse.statusCode, 201, createdResponse.body);
    const created = externalAccountResponseSchema.parse(createdResponse.json());
    assert.equal(created.userId, user.id);
    assert.equal(created.provider, 'CHESS_COM');
    assert.equal(created.displayName, 'HTTP contract player');
    assert.equal(created.lastSyncAt, null);
    assert.equal(created.syncCursorTime, null);
    assert.equal(created.lastSyncRunId, null);
    assert.equal(created.isDefaultProgressAccount, false);
    assert.equal(typeof created.createdAt, 'string');
    assert.equal(typeof created.updatedAt, 'string');

    const lastSyncAt = new Date('2026-08-14T18:00:00.000Z');
    const syncCursorTime = new Date('2026-08-14T17:55:00.000Z');
    await prisma.externalAccount.update({
      where: { id: created.id },
      data: {
        providerUserId: `chess-com-${suffix}`,
        lastSyncAt,
        syncCursorTime,
      },
    });

    const listResponse = await app.inject({ method: 'GET', url: '/api/me/accounts' });
    assert.equal(listResponse.statusCode, 200, listResponse.body);
    const listedAccounts = externalAccountListResponseSchema.parse(listResponse.json());
    const listed = listedAccounts.find((item) => item.id === created.id);
    assert.ok(listed);
    assert.equal(listed.providerUserId, `chess-com-${suffix}`);
    assert.equal(listed.lastSyncAt, lastSyncAt.toISOString());
    assert.equal(listed.syncCursorTime, syncCursorTime.toISOString());
    assert.equal(listed.isDefaultProgressAccount, false);

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/me/accounts/${created.id}`,
    });
    assert.equal(detailResponse.statusCode, 200, detailResponse.body);
    const detail = externalAccountResponseSchema.parse(detailResponse.json());
    assert.equal(detail.id, created.id);
    assert.equal(detail.lastSyncAt, lastSyncAt.toISOString());

    const historyResponse = await app.inject({
      method: 'GET',
      url: `/api/me/accounts/${created.id}/rating-history`,
    });
    assert.equal(historyResponse.statusCode, 200, historyResponse.body);
    const history = accountRatingHistoryResponseSchema.parse(historyResponse.json());
    assert.deepEqual(history.account, {
      id: created.id,
      provider: 'CHESS_COM',
      username,
      displayName: 'HTTP contract player',
    });
    assert.equal(history.series.length, 3);
    assert.equal(history.yDomain, null);

    const statsResponse = await app.inject({
      method: 'GET',
      url: `/api/me/accounts/${created.id}/rating-stats`,
    });
    assert.equal(statsResponse.statusCode, 200, statsResponse.body);
    const stats = accountRatingStatsResponseSchema.parse(statsResponse.json());
    assert.deepEqual(stats.account, {
      id: created.id,
      provider: 'CHESS_COM',
      username,
      displayName: 'HTTP contract player',
    });
    assert.equal(stats.gamesCount, 0);
    assert.equal(stats.data.version, 3);
    assert.equal(stats.data.speeds.length, 3);

    const updatedResponse = await app.inject({
      method: 'PATCH',
      url: `/api/me/accounts/${created.id}`,
      payload: { displayName: null },
    });
    assert.equal(updatedResponse.statusCode, 200, updatedResponse.body);
    const updated = externalAccountResponseSchema.parse(updatedResponse.json());
    assert.equal(updated.displayName, null);
    assert.equal(updated.lastSyncAt, lastSyncAt.toISOString());

    const defaultResponse = await app.inject({
      method: 'PATCH',
      url: '/api/me/default-progress-account',
      payload: { accountId: created.id },
    });
    assert.equal(defaultResponse.statusCode, 200, defaultResponse.body);
    const defaultProgress = defaultProgressAccountResponseSchema.parse(defaultResponse.json());
    assert.equal(defaultProgress.defaultProgressAccountId, created.id);
    assert.equal(defaultProgress.account?.id, created.id);
    assert.equal(defaultProgress.account?.isDefaultProgressAccount, true);
    assert.equal(
      defaultProgress.accounts.find((item) => item.id === created.id)?.isDefaultProgressAccount,
      true,
    );

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/me/accounts/${created.id}`,
    });
    assert.equal(deleteResponse.statusCode, 200, deleteResponse.body);
    const deleted = externalAccountDeleteResponseSchema.parse(deleteResponse.json());
    assert.equal(deleted.deleted, true);
    assert.equal(deleted.account.id, created.id);
    assert.equal(deleted.account.displayName, null);
    assert.equal(deleted.account.lastSyncAt, lastSyncAt.toISOString());
    assert.equal(deleted.account.isDefaultProgressAccount, true);

    const persistedUser = await prisma.appUser.findUnique({
      where: { id: user.id },
      select: { defaultProgressAccountId: true },
    });
    assert.equal(persistedUser?.defaultProgressAccountId, null);
    assert.equal(await prisma.externalAccount.count({ where: { id: created.id } }), 0);
  } finally {
    await app.close();
    await prisma.appUser.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

function resolveSchema(document, schema) {
  if (!schema?.$ref) return schema;
  return schema.$ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((value, segment) => value?.[segment], document);
}
