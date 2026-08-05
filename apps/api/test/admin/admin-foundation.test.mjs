import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';
import {
  validateAdminAuthConfig,
} from '../../dist/modules/admin/admin-auth.config.js';
import {
  createAdminAuthorizationPolicy,
} from '../../dist/modules/admin/admin-authorization.service.js';
import {
  decodeAdminUserCursor,
  encodeAdminUserCursor,
} from '../../dist/modules/admin/admin-cursor.js';
import {
  createAdminDiagnosticsService,
} from '../../dist/modules/admin/admin-diagnostics.service.js';
import {
  normalizeVerifiedSessionContext,
} from '../../dist/auth/verified-session-context.js';

const TEST_SECRET = new Uint8Array(32).fill(7);
const TEST_AUTH = { mode: 'dev-single-user', userId: 1 };
const TEST_ADMIN = {
  mode: 'test',
  userIds: new Set([1]),
  actorKeySecret: TEST_SECRET,
  actorKeyVersion: 3,
};

assert.throws(
  () => validateAdminAuthConfig(TEST_AUTH, {
    mode: 'clerk-subject-allowlist',
    subjectAllowlist: new Set(['user_admin']),
    actorKeySecret: TEST_SECRET,
    actorKeyVersion: 1,
  }),
  /requires AUTH_MODE=clerk/,
);

const session = normalizeVerifiedSessionContext({
  sid: 'sess_123',
  v: 2,
  iat: 1_722_800_000,
  jti: 'jwt_123',
  azp: 'https://app.example.test',
  fva: [3, -1],
  reverification_id: 'rev_123',
  crt_admin: 'ADMIN',
}, 'user_admin');
assert.ok(session);
assert.equal(session.sessionId, 'sess_123');
assert.deepEqual(session.factorVerificationAge, [3, -1]);
assert.equal('adminClaim' in session, false, 'token-side administrator claims must not enter verified session state');
assert.equal(normalizeVerifiedSessionContext({ sid: 'x' }, 'user_admin'), null);

const policy = createAdminAuthorizationPolicy({
  mode: 'clerk-subject-allowlist',
  subjectAllowlist: new Set(['user_admin']),
  actorKeySecret: TEST_SECRET,
  actorKeyVersion: 4,
});
const principal = policy.resolve({
  auth: {
    userId: 9,
    provider: 'clerk',
    externalSubject: 'user_admin',
  },
  verifiedSession: session,
});
assert.ok(principal);
assert.equal(principal.actorKeyVersion, 4);
assert.deepEqual(principal.capabilities, ['ADMIN_DIAGNOSTICS_READ']);
assert.notEqual(principal.actorKey, policy.targetKey(9), 'actor and target key domains must differ');
assert.equal(policy.resolve({
  auth: { userId: 9, provider: 'clerk', externalSubject: 'user_other' },
  verifiedSession: session,
}), null, 'verified subject must match normal request auth');

const cursor = encodeAdminUserCursor(42);
assert.equal(decodeAdminUserCursor(cursor), 42);
assert.throws(() => decodeAdminUserCursor('v1.not-json'), /cursor is invalid/);
assert.throws(() => decodeAdminUserCursor('v2.abc'), /cursor is invalid/);

const now = new Date('2026-08-04T20:00:00.000Z');
const repository = {
  listUsers: async ({ cursorId, limit }) => ({
    rows: [{
      id: cursorId ? cursorId - 1 : 10,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      accountCount: 2,
      activeAccountCount: 1,
      importedGameCount: 30,
      courseCount: 2,
      activeWorkCount: 1,
    }],
    hasMore: limit === 1,
  }),
  getUser: async (userId) => userId === 10 ? {
    id: 10,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  } : null,
  loadAccounts: async () => [{ provider: 'lichess', isActive: true, count: 1 }],
  loadGames: async () => ({
    total: 3,
    indexed: 2,
    analysed: 1,
    indexFailed: 1,
    notIndexed: 0,
    bySpeed: [{ speedCategory: 'blitz', count: 3 }],
    byAnalysisState: [{ latestAnalysisStatus: null, count: 2 }, { latestAnalysisStatus: 'COMPLETED', count: 1 }],
  }),
  loadCourses: async () => { throw new Error('simulated optional section failure'); },
  loadTraining: async () => ({
    sessions: 4,
    sublineAttempts: 2,
    latestSessionAt: new Date('2026-08-03T00:00:00.000Z'),
    latestSublineAttemptAt: null,
  }),
  loadPreparationSummary: async () => ({ totalRuns: 1, activeRuns: 1, latestUpdatedAt: now }),
  loadFootprint: async () => ({
    externalAccounts: 1,
    importedGames: 3,
    courses: 0,
    chapters: 0,
    lines: 0,
    trainingSessions: 4,
    trainingSublineAttempts: 2,
    importRuns: 1,
    jobRuns: 1,
    preparationRuns: 1,
  }),
  loadJobs: async () => [{
    id: 1,
    kind: 'ANALYSE_GAMES',
    source: 'ONBOARDING',
    status: 'QUEUED',
    totalTasks: 3,
    createdAt: new Date('2026-08-04T19:50:00.000Z'),
    updatedAt: new Date('2026-08-04T19:50:00.000Z'),
    startedAt: null,
    completedAt: null,
    taskCounts: { QUEUED: 3 },
    activeWorkKeys: 0,
  }],
  loadImports: async () => ({
    queuedCount: 21,
    oldestQueuedStartedAt: new Date('2026-08-04T19:50:00.000Z'),
    rows: [{
      id: 2,
      accountId: 5,
      provider: 'lichess',
      status: 'QUEUED',
      gamesSeen: 0,
      gamesImported: 0,
      gamesFailed: 0,
      startedAt: new Date('2026-08-04T19:59:30.000Z'),
      completedAt: null,
    }],
  }),
  loadPreparationRuns: async () => [{
    id: 3,
    purpose: 'INITIAL',
    status: 'RUNNING',
    attentionCode: null,
    reconcileAfter: new Date('2026-08-04T19:59:30.000Z'),
    createdAt: new Date('2026-08-04T19:00:00.000Z'),
    updatedAt: new Date('2026-08-04T19:59:00.000Z'),
    completedAt: null,
  }],
};
const diagnostics = createAdminDiagnosticsService({ repository, clock: () => now });
const list = await diagnostics.listUsers({ limit: 1 });
assert.equal(list.items.length, 1);
assert.ok(list.nextCursor);
const detail = await diagnostics.getUserDetail(10);
assert.deepEqual(detail.sections.courses, { available: false, reason: 'QUERY_FAILED' });
assert.equal(detail.sections.accounts.available, true);
assert.equal('email' in detail.user, false);
const work = await diagnostics.getUserWork(10, 20);
assert.deepEqual(work.sections.jobs.items[0].warnings.map((item) => item.code), ['ONBOARDING_ANALYSIS_QUEUE_AGE_HIGH']);
assert.deepEqual(work.sections.imports.items[0].warnings, [], 'recent bounded rows must not fabricate old-age evidence');
assert.deepEqual(
  work.sections.imports.warnings.map((item) => item.code),
  ['IMPORT_QUEUE_AGE_HIGH', 'IMPORT_QUEUE_BACKLOG_HIGH'],
);
assert.deepEqual(
  work.sections.imports.warnings.map((item) => item.evidence.observed),
  [600, 21],
);
assert.deepEqual(work.sections.preparation.items[0].warnings.map((item) => item.code), ['PREPARATION_RECONCILE_LAG']);
await assert.rejects(() => diagnostics.getUserDetail(999), /not found/);

function fakeDiagnosticsService(calls) {
  return {
    listUsers: async (query) => {
      calls.push(['list', query]);
      return { items: [], nextCursor: null };
    },
    getUserDetail: async (userId) => {
      calls.push(['detail', userId]);
      return {
        user: { id: userId, createdAt: now.toISOString(), updatedAt: now.toISOString() },
        sections: {
          accounts: { available: true, total: 0, active: 0, groups: [] },
          games: { available: true, total: 0, indexed: 0, analysed: 0, bySpeed: [], byIndexState: [
            { state: 'INDEXED', count: 0 },
            { state: 'INDEX_FAILED', count: 0 },
            { state: 'NOT_INDEXED', count: 0 },
          ], byAnalysisState: [] },
          courses: { available: true, courses: 0, chapters: 0, lines: 0 },
          training: { available: true, sessions: 0, sublineAttempts: 0, latestSessionAt: null, latestSublineAttemptAt: null },
          preparation: { available: true, totalRuns: 0, activeRuns: 0, latestUpdatedAt: null, warnings: [] },
          footprint: { available: true, rowCounts: {
            externalAccounts: 0, importedGames: 0, courses: 0, chapters: 0, lines: 0,
            trainingSessions: 0, trainingSublineAttempts: 0, importRuns: 0, jobRuns: 0, preparationRuns: 0,
          } },
          lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
        },
      };
    },
    getUserWork: async (userId) => {
      calls.push(['work', userId]);
      return {
        userId,
        sections: {
          jobs: { available: true, items: [] },
          imports: { available: true, queuedCount: 0, items: [], warnings: [] },
          preparation: { available: true, items: [] },
          lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
        },
      };
    },
  };
}

async function withApp(options, callback) {
  const app = await buildApp({
    logger: false,
    authConfig: TEST_AUTH,
    prisma: { $disconnect: async () => {} },
    ...options,
  });
  try {
    await app.ready();
    await callback(app);
  } finally {
    await app.close();
  }
}

const deniedCalls = [];
await withApp({
  adminAuthConfig: { ...TEST_ADMIN, userIds: new Set() },
  adminDiagnosticsService: fakeDiagnosticsService(deniedCalls),
}, async (app) => {
  const denied = await app.inject({ method: 'GET', url: '/api/admin/users/999' });
  assert.equal(denied.statusCode, 403);
  assert.deepEqual(denied.json(), { message: 'Forbidden', code: 'ADMIN_FORBIDDEN' });
  assert.deepEqual(deniedCalls, [], 'authorization must happen before target lookup');
});

const routeCalls = [];
await withApp({
  adminAuthConfig: TEST_ADMIN,
  adminDiagnosticsService: fakeDiagnosticsService(routeCalls),
}, async (app) => {
  const me = await app.inject({ method: 'GET', url: '/api/admin/me' });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().requestBudget.enforcement, 'UNENFORCED');

  const users = await app.inject({ method: 'GET', url: '/api/admin/users?limit=10' });
  assert.equal(users.statusCode, 200);
  assert.deepEqual(routeCalls[0], ['list', { limit: 10 }]);

  const detailResponse = await app.inject({ method: 'GET', url: '/api/admin/users/10' });
  assert.equal(detailResponse.statusCode, 200);

  const document = app.swagger();
  assert.equal(document.paths['/api/admin/me'].get.operationId, 'getAdminMe');
  assert.equal(document.paths['/api/admin/users'].get.operationId, 'listAdminUsers');
  assert.equal(document.paths['/api/admin/users/{userId}'].get.operationId, 'getAdminUserDetail');
  assert.ok(document.paths['/api/admin/users'].get.responses['500']);
});

await withApp({
  adminAuthConfig: TEST_ADMIN,
  adminDiagnosticsService: fakeDiagnosticsService([]),
  adminRequestBudget: {
    enforcement: () => 'ENFORCED',
    check: async () => ({ enforcement: 'ENFORCED', allowed: false, retryAfterSeconds: 30 }),
  },
}, async (app) => {
  const rejected = await app.inject({ method: 'GET', url: '/api/admin/me' });
  assert.equal(rejected.statusCode, 429);
  assert.equal(rejected.headers['retry-after'], '30');
});

await withApp({
  adminAuthConfig: TEST_ADMIN,
  adminDiagnosticsService: {
    ...fakeDiagnosticsService([]),
    listUsers: async () => { throw new Error('sensitive database detail'); },
  },
}, async (app) => {
  const failed = await app.inject({ method: 'GET', url: '/api/admin/users' });
  assert.equal(failed.statusCode, 500);
  assert.deepEqual(failed.json(), { error: 'Administrator diagnostics unavailable' });
  assert.doesNotMatch(failed.body, /sensitive database detail/);
});

await withApp({
  adminAuthConfig: TEST_ADMIN,
  adminDiagnosticsService: fakeDiagnosticsService([]),
  adminRequestBudget: {
    enforcement: () => 'ENFORCED',
    check: async () => { throw new Error('sensitive budget detail'); },
  },
}, async (app) => {
  const failed = await app.inject({ method: 'GET', url: '/api/admin/me' });
  assert.equal(failed.statusCode, 500);
  assert.deepEqual(failed.json(), { error: 'Administrator diagnostics unavailable' });
  assert.doesNotMatch(failed.body, /sensitive budget detail/);
});

console.log('Administrator authorization and diagnostics foundation tests passed.');
