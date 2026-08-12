import assert from 'node:assert/strict';
import {
  createChessComAccountImportExecutor,
} from '../../dist/modules/account-imports/providers/chess-com/chess-com-account-import.executor.js';
import { ChessComRateLimitError } from '../../dist/modules/account-imports/providers/chess-com/chess-com.provider.js';

await absentMonthAdvancesExactCoverageWithoutMonthlyFetch();
await listedMonthUsesBoundedWritesAndExactScope();
await listedArchiveFailureDoesNotAdvanceCoverage();
await provedCoverageRepairsCheckpointAfterRestart();
await rateLimitReturnsRetryAtWithoutCoverageAdvance();
await cancellationStopsBeforePersistence();
await malformedArchiveIndexFailsWithoutCoverage();
await malformedGameCommitsFailureCounterWithoutCoverage();

async function absentMonthAdvancesExactCoverageWithoutMonthlyFetch() {
  const events = [];
  const repository = repositoryStub({ events });
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() { events.push('archives'); return { archives: [] }; },
      async fetchMonthlyArchive() { throw new Error('monthly archive should not be fetched'); },
    },
    events,
  });
  const context = executionContext(events);
  const result = await executor.execute(claimedRun({
    requestedFrom: new Date('2026-02-01T00:00:00Z'),
    requestedTo: new Date('2026-03-01T00:00:00Z'),
  }), context);

  assert.deepEqual(result, { kind: 'COMPLETED' });
  assert.equal(repository.windowCommits.length, 1);
  assert.equal(repository.persistedBatches.length, 0);
  assert.equal(repository.windowCommits[0].windowsCompleted, 1);
  assert.deepEqual(
    events.filter((event) => ['archives', 'window-commit', 'plan-commit', 'checkpoint'].includes(event)),
    ['plan-commit', 'archives', 'window-commit'],
  );
}

async function listedMonthUsesBoundedWritesAndExactScope() {
  const events = [];
  const repository = repositoryStub({ events });
  const inside = Array.from({ length: 205 }, (_, index) => gameAt(
    new Date(Date.UTC(2026, 1, 1, 0, 0, index)),
    index,
  ));
  const outside = gameAt(new Date('2026-03-01T00:00:00Z'), 999);
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() {
        return { archives: ['https://api.chess.com/pub/player/alice/games/2026/02'] };
      },
      async fetchMonthlyArchive(_username, year, month, signal) {
        assert.equal(year, 2026);
        assert.equal(month, 2);
        assert.equal(signal.aborted, false);
        return { games: [...inside, outside] };
      },
    },
    events,
  });
  const context = executionContext(events);

  await executor.execute(claimedRun({
    requestedFrom: new Date('2026-02-01T00:00:00Z'),
    requestedTo: new Date('2026-03-01T00:00:00Z'),
  }), context);

  assert.deepEqual(repository.persistedBatches.map((batch) => batch.length), [100, 100, 5]);
  assert.equal(repository.persistedBatches.flat().length, 205);
  assert.equal(repository.planCommits.length, 1);
  assert.equal(repository.windowCommits.length, 1);
  assert.deepEqual(repository.batchCounters.map((counter) => counter.gamesSeenDelta), [100, 100, 6]);
  assert.deepEqual(repository.batchCounters.map((counter) => counter.gamesSkippedOutOfScopeDelta), [0, 0, 1]);
  assert.ok(events.indexOf('persist') < events.indexOf('activity'));
  assert.ok(events.lastIndexOf('activity') < events.indexOf('window-commit'));
  assert.equal(context.checkpoints.length, 0, 'provider progress never bypasses the guarded commit seam');
}

async function listedArchiveFailureDoesNotAdvanceCoverage() {
  const repository = repositoryStub();
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() {
        return { archives: ['https://api.chess.com/pub/player/alice/games/2026/02'] };
      },
      async fetchMonthlyArchive() { throw new Error('listed archive failed'); },
    },
  });

  await assert.rejects(
    () => executor.execute(claimedRun({
      requestedFrom: new Date('2026-02-01T00:00:00Z'),
      requestedTo: new Date('2026-03-01T00:00:00Z'),
    }), executionContext()),
    /listed archive failed/,
  );
  assert.equal(repository.windowCommits.length, 0);
}

async function provedCoverageRepairsCheckpointAfterRestart() {
  const repository = repositoryStub({
    coverage: coverage('2026-03-01T00:00:00Z', '2026-04-01T00:00:00Z'),
  });
  const fetchedMonths = [];
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() {
        return {
          archives: [
            'https://api.chess.com/pub/player/alice/games/2026/01',
            'https://api.chess.com/pub/player/alice/games/2026/02',
            'https://api.chess.com/pub/player/alice/games/2026/03',
          ],
        };
      },
      async fetchMonthlyArchive(_username, year, month) {
        fetchedMonths.push(`${year}-${String(month).padStart(2, '0')}`);
        return { games: [] };
      },
    },
  });

  await executor.execute(claimedRun({
    mode: 'BOUNDED_INITIAL',
    windowsCompleted: 0,
    requestedFrom: new Date('2026-01-01T00:00:00Z'),
    requestedTo: new Date('2026-04-01T00:00:00Z'),
  }), executionContext());

  assert.deepEqual(fetchedMonths, ['2026-02', '2026-01']);
  assert.equal(repository.planCommits[0].windowsCompleted, 1, 'proved March coverage repairs stale checkpoint');
  assert.equal(repository.windowCommits.at(-1).windowsCompleted, 3);
}

async function rateLimitReturnsRetryAtWithoutCoverageAdvance() {
  const repository = repositoryStub();
  const retryAt = new Date('2026-08-12T05:00:00Z');
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() { throw new ChessComRateLimitError(retryAt, 'Too Many Requests'); },
      async fetchMonthlyArchive() { throw new Error('not reached'); },
    },
  });

  const result = await executor.execute(claimedRun(), executionContext());
  assert.deepEqual(result, {
    kind: 'RETRY_AT',
    retryAt,
    rateLimitUntil: retryAt,
    errorCode: 'CHESS_COM_HTTP_429',
    safeError: 'Chess.com rate limit encountered; retry scheduled.',
  });
  assert.equal(repository.windowCommits.length, 0);
}

async function cancellationStopsBeforePersistence() {
  const controller = new AbortController();
  const repository = repositoryStub();
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() {
        return { archives: ['https://api.chess.com/pub/player/alice/games/2026/08'] };
      },
      async fetchMonthlyArchive() {
        controller.abort(new Error('cancelled by test'));
        return { games: [gameAt(new Date('2026-08-02T00:00:00Z'), 1)] };
      },
    },
  });

  await assert.rejects(
    () => executor.execute(claimedRun(), executionContext([], controller.signal)),
    /cancelled by test/,
  );
  assert.equal(repository.persistedBatches.length, 0);
  assert.equal(repository.windowCommits.length, 0);
}

async function malformedArchiveIndexFailsWithoutCoverage() {
  const repository = repositoryStub();
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() { return {}; },
      async fetchMonthlyArchive() { throw new Error('not reached'); },
    },
  });

  await assert.rejects(
    () => executor.execute(claimedRun(), executionContext()),
    /archives array/,
  );
  assert.equal(repository.windowCommits.length, 0);
}

async function malformedGameCommitsFailureCounterWithoutCoverage() {
  const repository = repositoryStub();
  const executor = createExecutor({
    repository,
    client: {
      async fetchArchives() {
        return { archives: ['https://api.chess.com/pub/player/alice/games/2026/08'] };
      },
      async fetchMonthlyArchive() {
        return { games: [{ rated: true, time_class: 'blitz', rules: 'chess' }] };
      },
    },
  });

  await assert.rejects(
    () => executor.execute(claimedRun(), executionContext()),
    /stable id or URL/,
  );
  assert.equal(repository.persistedBatches.length, 1);
  assert.equal(repository.persistedBatches[0].length, 0);
  assert.deepEqual(repository.batchCounters[0], {
    gamesSeenDelta: 1,
    gamesSkippedOutOfScopeDelta: 0,
    gamesFailedDelta: 1,
  });
  assert.equal(repository.windowCommits.length, 0);
}

function createExecutor({ repository, client, events = [] }) {
  return createChessComAccountImportExecutor({
    repository,
    commitRepository: repository,
    client,
    accountRepository: {
      async getActiveOwnedAccount() {
        return { id: 5, userId: 2, provider: 'CHESS_COM', username: 'Alice' };
      },
    },
    activity: {
      async reconcileCommittedRange() { events.push('activity'); return {}; },
    },
    now: (() => {
      let value = 0;
      return () => ++value;
    })(),
  });
}

function repositoryStub({ coverage: initialCoverage = null, events = [] } = {}) {
  let currentCoverage = initialCoverage;
  const planCommits = [];
  const persistedBatches = [];
  const batchCounters = [];
  const windowCommits = [];
  return {
    planCommits,
    persistedBatches,
    batchCounters,
    windowCommits,
    async getCoverage() { return currentCoverage; },
    async initializePlan(input) {
      events.push('plan-commit');
      planCommits.push(input);
    },
    async persistBatch(input) {
      events.push('persist');
      persistedBatches.push(input.games);
      batchCounters.push({
        gamesSeenDelta: input.gamesSeenDelta,
        gamesSkippedOutOfScopeDelta: input.gamesSkippedOutOfScopeDelta,
        gamesFailedDelta: input.gamesFailedDelta,
      });
      return { attempted: input.games.length, inserted: input.games.length, duplicate: 0 };
    },
    async completeWindow(input) {
      events.push('window-commit');
      windowCommits.push(input);
      const from = currentCoverage?.coveredFrom && currentCoverage.coveredFrom < input.coveredFrom
        ? currentCoverage.coveredFrom
        : input.coveredFrom;
      const through = currentCoverage?.coveredThrough && currentCoverage.coveredThrough > input.coveredThrough
        ? currentCoverage.coveredThrough
        : input.coveredThrough;
      currentCoverage = coverage(from, through);
    },
  };
}

function executionContext(events = [], signal = new AbortController().signal) {
  const checkpoints = [];
  return {
    signal,
    checkpoints,
    async checkpoint(input) { events.push('checkpoint'); checkpoints.push(input); },
    recordStageTiming() {},
  };
}

function claimedRun(overrides = {}) {
  const now = new Date('2026-08-12T04:00:00Z');
  return {
    id: 10,
    userId: 2,
    accountId: 5,
    provider: 'CHESS_COM',
    mode: 'INCREMENTAL_FORWARD',
    source: 'USER_ACTION',
    status: 'RUNNING',
    scopeVersion: 1,
    scopeHash: 'scope',
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: new Date('2026-08-01T00:00:00Z'),
    requestedTo: new Date('2026-09-01T00:00:00Z'),
    retryOfImportRunId: null,
    priority: 100,
    windowsTotal: null,
    windowsCompleted: 0,
    gamesSeen: 0,
    gamesMatchedScope: 0,
    gamesImported: 0,
    gamesDuplicate: 0,
    gamesSkippedOutOfScope: 0,
    gamesFailed: 0,
    lastProgressAt: null,
    workKey: 'ACCOUNT_IMPORT:test',
    claimedAt: now,
    heartbeatAt: now,
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

function coverage(from, through) {
  const now = new Date('2026-08-12T04:00:00Z');
  return {
    id: 1,
    accountId: 5,
    scopeVersion: 1,
    scopeHash: 'scope',
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    coveredFrom: from instanceof Date ? from : new Date(from),
    coveredThrough: through instanceof Date ? through : new Date(through),
    lastCompletedImportRunId: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function gameAt(date, id) {
  return {
    uuid: `game-${id}`,
    url: `https://www.chess.com/game/live/${id}`,
    pgn: '[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]',
    end_time: Math.floor(date.getTime() / 1000),
    rated: true,
    time_class: 'blitz',
    time_control: '300+0',
    rules: 'chess',
    white: { username: 'Alice', rating: 1500, result: 'win' },
    black: { username: 'Bob', rating: 1500, result: 'checkmated' },
  };
}
