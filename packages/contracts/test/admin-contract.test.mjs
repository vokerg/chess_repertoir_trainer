import assert from 'node:assert/strict';
import {
  adminMeResponseSchema,
  adminUserDetailResponseSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
  adminWorkQuerySchema,
} from '../dist/admin/index.js';

assert.deepEqual(adminUserListQuerySchema.parse({}), { limit: 25 });
assert.deepEqual(adminUserListQuerySchema.parse({ limit: '100', cursor: 'v1.abc' }), {
  limit: 100,
  cursor: 'v1.abc',
});
assert.equal(adminUserListQuerySchema.safeParse({ limit: 101 }).success, false);
assert.deepEqual(adminWorkQuerySchema.parse({}), { limit: 20 });

const me = {
  capabilities: ['ADMIN_DIAGNOSTICS_READ'],
  actorKeyVersion: 1,
  sessionEvidence: {
    hasVerifiedSession: true,
    hasFactorVerificationAge: true,
    hasReverificationId: false,
  },
  requestBudget: {
    enforcement: 'UNENFORCED',
    scope: 'STRICT_BOUNDS_AND_SECURITY_TELEMETRY',
  },
};
assert.deepEqual(adminMeResponseSchema.parse(me), me);

const list = {
  items: [{
    id: 7,
    createdAt: '2026-08-04T18:00:00.000Z',
    updatedAt: '2026-08-04T18:10:00.000Z',
    accountCount: 2,
    activeAccountCount: 1,
    importedGameCount: 40,
    courseCount: 3,
    activeWorkCount: 1,
    warnings: [],
  }],
  nextCursor: null,
};
assert.deepEqual(adminUserListResponseSchema.parse(list), list);

const detail = {
  user: {
    id: 7,
    createdAt: '2026-08-04T18:00:00.000Z',
    updatedAt: '2026-08-04T18:10:00.000Z',
  },
  sections: {
    accounts: { available: true, total: 1, active: 1, groups: [{ provider: 'lichess', active: true, count: 1 }] },
    games: {
      available: true,
      total: 1,
      indexed: 1,
      analysed: 0,
      bySpeed: [{ speed: 'blitz', count: 1 }],
      byIndexState: [
        { state: 'INDEXED', count: 1 },
        { state: 'INDEX_FAILED', count: 0 },
        { state: 'NOT_INDEXED', count: 0 },
      ],
      byAnalysisState: [{ state: null, count: 1 }],
    },
    courses: { available: true, courses: 0, chapters: 0, lines: 0 },
    training: { available: true, sessions: 0, sublineAttempts: 0, latestSessionAt: null, latestSublineAttemptAt: null },
    preparation: { available: true, totalRuns: 0, activeRuns: 0, latestUpdatedAt: null, warnings: [] },
    footprint: {
      available: true,
      rowCounts: {
        externalAccounts: 1,
        importedGames: 1,
        courses: 0,
        chapters: 0,
        lines: 0,
        trainingSessions: 0,
        trainingSublineAttempts: 0,
        importRuns: 0,
        jobRuns: 0,
        preparationRuns: 0,
      },
    },
    lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
  },
};
assert.deepEqual(adminUserDetailResponseSchema.parse(detail), detail);
assert.equal(
  adminUserDetailResponseSchema.safeParse({ ...detail, email: 'not-allowed@example.test' }).success,
  true,
);
assert.equal('email' in adminUserDetailResponseSchema.shape.user.shape, false);

console.log('Administrator diagnostics contract tests passed.');
