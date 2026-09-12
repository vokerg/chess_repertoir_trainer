import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import adminModule from '../../dist/modules/admin/admin.routes.js';

const now = '2026-09-12T16:00:00.000Z';
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
  previewExpiresAt: '2026-09-12T17:00:00.000Z',
  confirmationPhrase: 'PURGE ACCOUNT 5',
  warningCodes: ['DESTRUCTIVE_OPERATION'],
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

const executeCalls = [];
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
      actorKey: 'v1.execute-only',
      actorKeyVersion: 1,
      capabilities: ['ADMIN_LIFECYCLE_EXECUTE'],
      sessionId: null,
    }),
    targetKey: (userId) => `v1.target-${userId}`,
  },
  requestBudget: {
    enforcement: () => 'UNENFORCED',
    check: async () => ({ enforcement: 'UNENFORCED', allowed: true }),
  },
  lifecycleService: {
    previewForAdmin: async () => {
      throw new Error('not used');
    },
    executeForAdmin: async (...args) => {
      executeCalls.push(args);
      return operation;
    },
    get: async () => operation,
    requestStop: async () => operation,
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

  const body = {
    previewToken: 'preview-token-with-safe-length',
    confirmationPhrase: 'PURGE ACCOUNT 5',
    idempotencyKey: 'stable-key-44',
  };
  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/users/10/data-lifecycle/44/execute',
    payload: body,
  });

  assert.equal(response.statusCode, 202, response.body);
  assert.deepEqual(executeCalls, [
    [10, 44, body, { method: 'TYPED_CONFIRMATION_PHRASE' }],
  ]);
} finally {
  await app.close();
}

console.log('Administrator confirmation-only lifecycle route test passed.');
