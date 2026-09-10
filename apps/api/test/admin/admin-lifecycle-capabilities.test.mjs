import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import adminModule from '../../dist/modules/admin/admin.routes.js';

const now = '2026-09-09T06:00:00.000Z';
const operation = {
  operationId: 44,
  action: 'PURGE_ACCOUNT_DATA',
  status: 'FENCING',
  scope: { resourceType: 'ACCOUNT', userId: 10, accountId: 5 },
  previewCounts: {
    accounts: 1,
    games: 3,
    plies: 8,
    analysisRuns: 1,
    aiReviews: 0,
    tacticalDetections: 0,
    scenarioSessions: 0,
    importRuns: 1,
    jobRuns: 0,
    preparationRuns: 0,
  },
  previewExpiresAt: '2026-09-09T07:00:00.000Z',
  confirmationPhrase: 'PURGE ACCOUNT 5',
  warningCodes: [],
  stopRequest: 'NONE',
  firstDestructiveCommitAt: null,
  checkpoint: null,
  verification: null,
  terminalResult: null,
  errorCode: null,
  startedAt: now,
  completedAt: null,
  createdAt: now,
  updatedAt: now,
};

const stopCalls = [];
const app = Fastify({ logger: false });
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.addHook('onRequest', async (request) => {
  request.auth = {
    userId: 1,
    provider: 'dev-single-user',
    externalSubject: 'test-user:1',
  };
  request.verifiedSession = null;
});

await app.register(adminModule, {
  authorizationPolicy: {
    resolve: () => ({
      actorKey: 'v1.preview-only',
      actorKeyVersion: 1,
      capabilities: ['ADMIN_LIFECYCLE_PREVIEW'],
      sessionId: null,
    }),
    targetKey: (userId) => `v1.target-${userId}`,
  },
  requestBudget: {
    enforcement: () => 'UNENFORCED',
    check: async () => ({ enforcement: 'UNENFORCED', allowed: true }),
  },
  diagnosticsService: {
    listUsers: async () => ({ items: [], nextCursor: null }),
    getUserDetail: async () => {
      throw new Error('not used');
    },
    getUserWork: async () => {
      throw new Error('not used');
    },
  },
  lifecycleService: {
    previewForAdmin: async () => {
      throw new Error('not used');
    },
    executeForAdmin: async () => {
      throw new Error('not used');
    },
    get: async () => operation,
    requestStop: async (...args) => {
      stopCalls.push(args);
      return operation;
    },
    preview: async () => {
      throw new Error('not used');
    },
    execute: async () => {
      throw new Error('not used');
    },
  },
});

try {
  await app.ready();

  const read = await app.inject({
    method: 'GET',
    url: '/api/admin/users/10/data-lifecycle/44',
  });
  assert.equal(read.statusCode, 200, read.body);

  const stop = await app.inject({
    method: 'POST',
    url: '/api/admin/users/10/data-lifecycle/44/stop',
  });
  assert.equal(stop.statusCode, 403, stop.body);
  assert.deepEqual(stop.json(), { message: 'Forbidden', code: 'ADMIN_FORBIDDEN' });
  assert.deepEqual(stopCalls, [], 'preview-only administrators must not mutate lifecycle state');
} finally {
  await app.close();
}

console.log('Administrator lifecycle capability tests passed.');
