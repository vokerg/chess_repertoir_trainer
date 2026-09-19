import assert from 'node:assert/strict';
import { createLichessAccountImportExecutor } from '../../dist/modules/account-imports/providers/lichess/lichess-account-import.executor.js';
import {
  buildLichessGamesRequestUrl,
  readLichessNdjson,
} from '../../dist/modules/account-imports/providers/lichess/lichess-account-import.js';

await validatesSynthetic429Cooldown();
await validatesSyntheticCancellation();
await validatesLowVolumeLiveStream();

async function validatesLowVolumeLiveStream() {
  const username = requiredEnv('LICHESS_IMPORT_CANARY_USERNAME');
  const from = new Date(requiredEnv('LICHESS_IMPORT_CANARY_FROM'));
  const to = new Date(requiredEnv('LICHESS_IMPORT_CANARY_TO'));
  assert.equal(Number.isFinite(from.getTime()), true, 'LICHESS_IMPORT_CANARY_FROM must be an ISO timestamp');
  assert.equal(Number.isFinite(to.getTime()), true, 'LICHESS_IMPORT_CANARY_TO must be an ISO timestamp');
  assert.ok(from < to, 'canary range must be non-empty');
  assert.ok(to.getTime() - from.getTime() <= 6 * 60 * 60_000, 'canary range must not exceed six hours');

  const url = buildLichessGamesRequestUrl({
    username,
    window: { from, to },
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    mode: 'INCREMENTAL_FORWARD',
  });
  assert.equal(url.searchParams.get('since'), String(from.getTime()));
  assert.equal(url.searchParams.get('until'), String(to.getTime() - 1));
  assert.equal(url.searchParams.get('perfType'), 'blitz,rapid');

  const controller = new AbortController();
  const response = await fetch(url, {
    headers: { Accept: 'application/x-ndjson' },
    signal: controller.signal,
  });
  assert.equal(response.status, 200, `Lichess canary returned HTTP ${response.status}`);

  const initialHeap = process.memoryUsage().heapUsed;
  let peakHeap = initialHeap;
  let gamesSeen = 0;
  for await (const _game of readLichessNdjson(response, controller.signal)) {
    gamesSeen += 1;
    peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
    if (gamesSeen > 1_000) {
      controller.abort(new Error('Lichess canary exceeded the low-volume safety ceiling.'));
      throw controller.signal.reason;
    }
  }

  console.log('Bounded Lichess live canary passed.', {
    from: from.toISOString(),
    to: to.toISOString(),
    gamesSeen,
    peakHeapDeltaBytes: Math.max(0, peakHeap - initialHeap),
  });
}

async function validatesSynthetic429Cooldown() {
  const now = Date.parse('2026-08-11T10:00:00.000Z');
  let coverageWrites = 0;
  const executor = createLichessAccountImportExecutor({
    repository: {
      async getCoverage() { return null; },
    },
    commitRepository: {
      async initializePlan() {},
      async persistBatch() { assert.fail('429 must not persist games'); },
      async completeWindow() { coverageWrites += 1; },
    },
    config: { windowDays: 14, databaseWriteBatchSize: 100 },
    now: () => now,
    fetch: async () => new Response('', { status: 429, headers: { 'Retry-After': '10' } }),
    loadAccount: async () => ({ username: 'canary-placeholder' }),
    reconcileCommittedRange: async () => assert.fail('429 must not reconcile activity'),
  });
  const result = await executor.execute(claimedRun(), context());
  assert.equal(result.kind, 'RETRY_AT');
  assert.equal(result.errorCode, 'LICHESS_HTTP_429');
  assert.ok(result.retryAt.getTime() >= now + 60_000);
  assert.equal(coverageWrites, 0);
}

async function validatesSyntheticCancellation() {
  let cancelled = false;
  const controller = new AbortController();
  const line = `${JSON.stringify(providerGame('canary-cancel'))}\n`;
  const response = new Response(new ReadableStream({
    start(streamController) {
      streamController.enqueue(new TextEncoder().encode(line));
    },
    cancel() { cancelled = true; },
  }));
  const iterator = readLichessNdjson(response, controller.signal)[Symbol.asyncIterator]();
  assert.equal((await iterator.next()).value.id, 'canary-cancel');
  controller.abort(new Error('canary cancellation'));
  await assert.rejects(() => iterator.next(), /canary cancellation/);
  assert.equal(cancelled, true);
}

function context() {
  return {
    signal: new AbortController().signal,
    async checkpoint() {},
    recordStageTiming() {},
  };
}

function claimedRun() {
  const now = new Date('2026-08-11T09:00:00.000Z');
  return {
    id: 201,
    userId: 1,
    accountId: 2,
    provider: 'LICHESS',
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    status: 'RUNNING',
    scopeVersion: 1,
    scopeHash: 'a'.repeat(64),
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: new Date('2026-07-01T00:00:00.000Z'),
    requestedTo: new Date('2026-07-15T00:00:00.000Z'),
    retryOfImportRunId: null,
    priority: 100,
    windowsTotal: null,
    windowsCompleted: 0,
    gamesSeen: 0,
    gamesMatchedScope: 0,
    gamesImported: 0,
    gamesDuplicate: 0,
    gamesUpdated: 0,
    gamesSkipped: 0,
    gamesSkippedOutOfScope: 0,
    gamesFailed: 0,
    lastProgressAt: null,
    checkpoint: null,
    workKey: 'ACCOUNT_IMPORT:lichess-canary',
    claimedAt: now,
    heartbeatAt: now,
    pauseRequestedAt: null,
    cancelRequestedAt: null,
    retryAt: null,
    rateLimitUntil: null,
    startedAt: now,
    completedAt: null,
    errorCode: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

function providerGame(id) {
  return {
    id,
    rated: true,
    variant: 'standard',
    speed: 'blitz',
    perf: 'blitz',
    createdAt: Date.parse('2026-07-10T12:00:00.000Z'),
    lastMoveAt: Date.parse('2026-07-10T12:05:00.000Z'),
    status: 'mate',
    winner: 'white',
    players: {
      white: { user: { name: 'FixtureUser' }, rating: 1800 },
      black: { user: { name: 'Opponent' }, rating: 1900 },
    },
  };
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the opt-in Lichess canary.`);
  return value;
}
