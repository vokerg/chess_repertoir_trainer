import assert from 'node:assert/strict';
import {
  createLichessAccountImportExecutor,
} from '../../dist/modules/account-imports/providers/lichess/lichess-account-import.executor.js';

await emptyWindowAdvancesCoverage();
await boundedWritesAndAtomicProgress();
await outOfScopeRowsUseProgressOnlyCommit();
await malformedWindowFlushesAndFailsWithoutCoverage();
await interruptedTransportReplaysWithoutCoverage();
await transportFailureRecordsProviderTiming();
await duplicateReplayCompletesCoverage();
await batchFenceRejectsBeforeCoverage();
await coverageFenceRejectsEmptyWindow();
await providerErrorDoesNotAdvanceCoverage();
await rateLimitDefersForAtLeastOneMinute();
await restartUsesPersistedWindowPlan();
await rejectsCorruptCheckpointAndCoverageProgress();
await cancellationReachesProviderStream();

async function emptyWindowAdvancesCoverage() {
  const fixture = harness({ response: new Response('', { status: 200 }) });
  assert.deepEqual(await fixture.executor.execute(fixture.run, fixture.context), { kind: 'COMPLETED' });
  assert.equal(fixture.batchCommits.length, 0);
  assert.equal(fixture.windowCommits.length, 1);
  assert.equal(fixture.windowCommits[0].coveredFrom.toISOString(), fixture.run.requestedFrom.toISOString());
  assert.equal(fixture.windowCommits[0].coveredThrough.toISOString(), fixture.run.requestedTo.toISOString());
  assert.equal(fixture.windowCommits[0].windowsCompleted, 1);
  assert.equal(fixture.windowCommits[0].checkpoint.currentWindow, null);
}

async function boundedWritesAndAtomicProgress() {
  const games = Array.from({ length: 205 }, (_, index) => providerGame(`batch-${index + 1}`, index));
  const fixture = harness({ response: ndjsonResponse(games) });
  assert.deepEqual(await fixture.executor.execute(fixture.run, fixture.context), { kind: 'COMPLETED' });
  assert.deepEqual(fixture.persistedBatches.map((batch) => batch.length), [100, 100, 5]);
  assert.deepEqual(fixture.batchCommits.map((entry) => entry.gamesSeenDelta), [100, 100, 5]);
  assert.ok(fixture.batchCommits.every((entry) => entry.scopeHash === fixture.run.scopeHash));
  assert.ok(fixture.batchCommits.every((entry) => entry.checkpoint.currentWindow !== null));
  assert.equal(fixture.reconciliations.length, 3);
  assert.equal(fixture.windowCommits.length, 1);
  const firstBatch = fixture.events.indexOf('BATCH');
  const firstReconciliation = fixture.events.indexOf('RECONCILE');
  assert.ok(firstBatch >= 0 && firstReconciliation > firstBatch);
  assert.ok(fixture.timings.some((timing) => timing.stage === 'CHECKPOINT'));
  assert.ok(fixture.timings.some((timing) => timing.stage === 'PROVIDER'));
  assert.ok(fixture.timings.some((timing) => timing.stage === 'PARSE'));
  assert.ok(fixture.timings.some((timing) => timing.stage === 'WRITE'));
  assert.ok(fixture.timings.some((timing) => timing.stage === 'WINDOW'));
}

async function outOfScopeRowsUseProgressOnlyCommit() {
  const games = Array.from({ length: 3 }, (_, index) => ({
    ...providerGame(`out-${index + 1}`, index),
    speed: 'bullet',
    perf: 'bullet',
  }));
  const fixture = harness({ response: ndjsonResponse(games) });
  assert.deepEqual(await fixture.executor.execute(fixture.run, fixture.context), { kind: 'COMPLETED' });
  assert.equal(fixture.batchCommits.length, 1);
  assert.equal(fixture.batchCommits[0].games.length, 0);
  assert.equal(fixture.batchCommits[0].gamesSeenDelta, 3);
  assert.equal(fixture.batchCommits[0].gamesSkippedOutOfScopeDelta, 3);
  assert.equal(fixture.reconciliations.length, 0);
  assert.equal(fixture.windowCommits.length, 1);
}

async function malformedWindowFlushesAndFailsWithoutCoverage() {
  const good = Array.from({ length: 3 }, (_, index) => providerGame(`partial-${index + 1}`, index));
  const fixture = harness({
    response: new Response(`${good.map((game) => JSON.stringify(game)).join('\n')}\n{"id":`, { status: 200 }),
  });
  assert.deepEqual(await fixture.executor.execute(fixture.run, fixture.context), {
    kind: 'FAILED',
    errorCode: 'LICHESS_MALFORMED_NDJSON',
    safeError: 'Lichess returned a malformed game record.',
  });
  assert.deepEqual(fixture.persistedBatches.map((batch) => batch.length), [3, 0]);
  assert.equal(fixture.windowCommits.length, 0);
  assert.equal(fixture.batchCommits[0].gamesSeenDelta, 3);
  assert.equal(fixture.batchCommits[1].gamesSeenDelta, 1);
  assert.equal(fixture.batchCommits[1].gamesFailedDelta, 1);
  assert.equal(fixture.batchCommits[1].games.length, 0);
}

async function interruptedTransportReplaysWithoutCoverage() {
  const games = Array.from({ length: 100 }, (_, index) => providerGame(`interrupted-${index + 1}`, index));
  const bytes = new TextEncoder().encode(`${games.map((game) => JSON.stringify(game)).join('\n')}\n`);
  let pullCount = 0;
  const response = new Response(new ReadableStream({
    pull(controller) {
      pullCount += 1;
      if (pullCount === 1) controller.enqueue(bytes);
      else controller.error(new Error('transport interrupted'));
    },
  }, { highWaterMark: 0 }), { status: 200 });
  const fixture = harness({ response });
  await assert.rejects(() => fixture.executor.execute(fixture.run, fixture.context), /transport interrupted/);
  assert.deepEqual(fixture.persistedBatches.map((batch) => batch.length), [100]);
  assert.equal(fixture.batchCommits[0].gamesSeenDelta, 100);
  assert.equal(fixture.windowCommits.length, 0);
}

async function transportFailureRecordsProviderTiming() {
  let clock = 1_000;
  const fixture = harness({
    now: () => clock,
    fetch: async () => {
      clock += 17;
      throw new Error('provider transport failed');
    },
  });
  await assert.rejects(() => fixture.executor.execute(fixture.run, fixture.context), /provider transport failed/);
  assert.ok(fixture.timings.some((timing) => timing.stage === 'PROVIDER' && timing.durationMs === 17));
  assert.equal(fixture.windowCommits.length, 0);
}

async function duplicateReplayCompletesCoverage() {
  const games = Array.from({ length: 100 }, (_, index) => providerGame(`replay-${index + 1}`, index));
  const persistedIds = new Set(games.map((game) => game.id));
  const fixture = harness({
    response: ndjsonResponse(games),
    persistBatch: async (input) => {
      const inserted = input.games.filter((game) => !persistedIds.has(game.providerGameId)).length;
      for (const game of input.games) persistedIds.add(game.providerGameId);
      return { attempted: input.games.length, inserted, duplicate: input.games.length - inserted };
    },
  });
  assert.deepEqual(await fixture.executor.execute(fixture.run, fixture.context), { kind: 'COMPLETED' });
  assert.equal(persistedIds.size, 100);
  assert.equal(fixture.windowCommits.length, 1);
}

async function batchFenceRejectsBeforeCoverage() {
  const fence = new Error('lifecycle-fenced');
  const fixture = harness({
    response: ndjsonResponse([providerGame('fenced')]),
    persistBatch: async () => { throw fence; },
  });
  await assert.rejects(() => fixture.executor.execute(fixture.run, fixture.context), fence);
  assert.equal(fixture.windowCommits.length, 0);
  assert.equal(fixture.reconciliations.length, 0);
}

async function coverageFenceRejectsEmptyWindow() {
  const fence = new Error('coverage-lifecycle-fenced');
  const fixture = harness({
    response: new Response('', { status: 200 }),
    completeWindow: async () => { throw fence; },
  });
  await assert.rejects(() => fixture.executor.execute(fixture.run, fixture.context), fence);
  assert.equal(fixture.windowCommits.length, 1);
}

async function providerErrorDoesNotAdvanceCoverage() {
  const fixture = harness({ response: new Response('private upstream detail', { status: 503 }) });
  assert.deepEqual(await fixture.executor.execute(fixture.run, fixture.context), {
    kind: 'FAILED',
    errorCode: 'LICHESS_HTTP_503',
    safeError: 'Lichess account import request failed with HTTP 503.',
  });
  assert.equal(fixture.batchCommits.length, 0);
  assert.equal(fixture.windowCommits.length, 0);
}

async function rateLimitDefersForAtLeastOneMinute() {
  const now = Date.parse('2026-08-11T10:00:00.000Z');
  const fixture = harness({
    response: new Response('', { status: 429, headers: { 'Retry-After': '10' } }),
    now: () => now,
  });
  const result = await fixture.executor.execute(fixture.run, fixture.context);
  assert.equal(result.kind, 'RETRY_AT');
  assert.equal(result.retryAt.toISOString(), '2026-08-11T10:01:00.000Z');
  assert.equal(result.rateLimitUntil.toISOString(), result.retryAt.toISOString());
  assert.equal(fixture.windowCommits.length, 0);
}

async function restartUsesPersistedWindowPlan() {
  const run = claimedRun({
    requestedFrom: new Date('2026-07-01T00:00:00.000Z'),
    requestedTo: new Date('2026-07-29T00:00:00.000Z'),
    windowsTotal: 2,
    checkpoint: {
      version: 1,
      provider: 'LICHESS',
      windowDays: 14,
      currentWindow: {
        index: 0,
        from: '2026-07-15T00:00:00.000Z',
        to: '2026-07-29T00:00:00.000Z',
      },
    },
  });
  const requests = [];
  const fixture = harness({
    run,
    config: { windowDays: 7, databaseWriteBatchSize: 100 },
    fetch: async (url) => {
      requests.push(new URL(url));
      return new Response('', { status: 200 });
    },
  });
  assert.deepEqual(await fixture.executor.execute(fixture.run, fixture.context), { kind: 'COMPLETED' });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].searchParams.get('since'), String(Date.parse('2026-07-15T00:00:00.000Z')));
  assert.equal(requests[0].searchParams.get('until'), String(Date.parse('2026-07-29T00:00:00.000Z') - 1));
}

async function rejectsCorruptCheckpointAndCoverageProgress() {
  const corrupt = harness({
    run: claimedRun({
      checkpoint: {
        version: 1,
        provider: 'LICHESS',
        windowDays: 14,
        currentWindow: { index: -1, from: 'bad', to: 'also-bad' },
      },
    }),
  });
  await assert.rejects(() => corrupt.executor.execute(corrupt.run, corrupt.context), /checkpoint currentWindow/i);

  const mismatched = harness({
    run: claimedRun({
      requestedFrom: new Date('2026-07-01T00:00:00.000Z'),
      requestedTo: new Date('2026-07-29T00:00:00.000Z'),
      windowsTotal: 2,
      checkpoint: {
        version: 1,
        provider: 'LICHESS',
        windowDays: 14,
        currentWindow: {
          index: 0,
          from: '2026-07-14T00:00:00.000Z',
          to: '2026-07-28T00:00:00.000Z',
        },
      },
    }),
  });
  await assert.rejects(() => mismatched.executor.execute(mismatched.run, mismatched.context), /does not match/i);

  const inconsistent = harness({ run: claimedRun({ windowsTotal: 1, windowsCompleted: 1 }), coverage: null });
  await assert.rejects(() => inconsistent.executor.execute(inconsistent.run, inconsistent.context), /exceeds proved coverage/i);
}

async function cancellationReachesProviderStream() {
  let seenSignal = null;
  let cancelCalled = false;
  const controller = new AbortController();
  const stream = new ReadableStream({
    start(streamController) {
      streamController.enqueue(new TextEncoder().encode(`${JSON.stringify(providerGame('before-abort'))}\n`));
    },
    cancel() { cancelCalled = true; },
  });
  const fixture = harness({
    fetch: async (_url, init) => {
      seenSignal = init.signal;
      setTimeout(() => controller.abort(new Error('provider cancelled')), 0);
      return new Response(stream, { status: 200 });
    },
    signal: controller.signal,
  });
  await assert.rejects(() => fixture.executor.execute(fixture.run, fixture.context), /provider cancelled/);
  assert.equal(seenSignal, controller.signal);
  assert.equal(fixture.windowCommits.length, 0);
  assert.equal(cancelCalled, true);
}

function harness(overrides = {}) {
  const run = overrides.run ?? claimedRun();
  const timings = [];
  const persistedBatches = [];
  const batchCommits = [];
  const planCommits = [];
  const windowCommits = [];
  const reconciliations = [];
  const events = [];
  let coverage = overrides.coverage ?? null;
  const response = overrides.response ?? new Response('', { status: 200 });
  const repository = {
    async getCoverage() { return coverage; },
  };
  const commitRepository = {
    async initializePlan(input) {
      events.push('PLAN');
      planCommits.push(structuredClone(input));
      if (overrides.initializePlan) return overrides.initializePlan(input);
    },
    async persistBatch(input) {
      events.push('BATCH');
      batchCommits.push(structuredClone(input));
      if (overrides.persistBatch) return overrides.persistBatch(input);
      persistedBatches.push(input.games.map((game) => ({ ...game })));
      return { attempted: input.games.length, inserted: input.games.length, duplicate: 0 };
    },
    async completeWindow(input) {
      events.push('WINDOW_COMMIT');
      windowCommits.push(structuredClone(input));
      if (overrides.completeWindow) return overrides.completeWindow(input);
      const from = coverage?.coveredFrom && coverage.coveredFrom < input.coveredFrom
        ? coverage.coveredFrom
        : input.coveredFrom;
      const through = coverage?.coveredThrough && coverage.coveredThrough > input.coveredThrough
        ? coverage.coveredThrough
        : input.coveredThrough;
      coverage = coverageRecord(run, from, through);
    },
  };
  const executor = createLichessAccountImportExecutor({
    repository,
    commitRepository,
    config: overrides.config ?? { windowDays: 14, databaseWriteBatchSize: 100 },
    now: overrides.now ?? Date.now,
    fetch: overrides.fetch ?? (async () => response),
    baseUrl: 'https://example.invalid/api/games/user',
    loadAccount: async () => ({ username: 'FixtureUser' }),
    reconcileCommittedRange: async (input) => {
      events.push('RECONCILE');
      reconciliations.push(input);
    },
  });
  const context = {
    signal: overrides.signal ?? new AbortController().signal,
    async checkpoint() { assert.fail('Lichess provider progress must use the shared provider commit seam'); },
    recordStageTiming(stage, durationMs) { timings.push({ stage, durationMs }); },
  };
  return {
    run,
    executor,
    context,
    timings,
    persistedBatches,
    batchCommits,
    planCommits,
    windowCommits,
    reconciliations,
    events,
  };
}

function claimedRun(overrides = {}) {
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
    workKey: 'ACCOUNT_IMPORT:test-lichess',
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
    ...overrides,
  };
}

function coverageRecord(run, coveredFrom, coveredThrough) {
  return {
    id: 1,
    accountId: run.accountId,
    scopeVersion: 1,
    scopeHash: run.scopeHash,
    scope: run.scope,
    coveredFrom,
    coveredThrough,
    lastCompletedImportRunId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function ndjsonResponse(games) {
  return new Response(`${games.map((game) => JSON.stringify(game)).join('\n')}\n`, { status: 200 });
}

function providerGame(id, index = 0) {
  return {
    id,
    rated: true,
    variant: 'standard',
    speed: index % 2 === 0 ? 'blitz' : 'rapid',
    perf: index % 2 === 0 ? 'blitz' : 'rapid',
    createdAt: Date.parse('2026-07-10T12:00:00.000Z') + index * 1000,
    lastMoveAt: Date.parse('2026-07-10T12:05:00.000Z') + index * 1000,
    status: 'mate',
    winner: 'white',
    players: {
      white: { user: { name: 'FixtureUser' }, rating: 1800 },
      black: { user: { name: 'Opponent' }, rating: 1900 },
    },
  };
}

console.log('Bounded Lichess executor tests passed.');