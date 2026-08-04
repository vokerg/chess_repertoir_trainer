import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { Chess } from 'chess.js';
import prismaModule from '../dist/prisma.js';
import { LichessImportService } from '../dist/services/lichessImportService.js';
import { ChessComImportService } from '../dist/services/chessComImportService.js';
import { ImportedGameProcessingService } from '../dist/modules/imported-games/imported-game-processing.service.js';
import { ImportedGamesService } from '../dist/modules/imported-games/imported-games.service.js';
import { WasmStockfishEngineService } from '../dist/modules/analysis/wasm-stockfish-engine.service.js';
import { JobRunService } from '../dist/modules/jobs/job-run.service.js';
import { createJobWorker } from '../dist/modules/jobs/job-worker.service.js';
import { JobWorkerRepository } from '../dist/modules/jobs/job-worker.repository.prisma.js';
import { defaultJobTaskExecutorRegistry } from '../dist/modules/jobs/imported-game-job-executors.js';

const prisma = prismaModule.default;
const reportPath = process.env.ONBOARDING_BENCHMARK_REPORT_PATH
  ?? path.resolve(process.cwd(), 'onboarding-throughput-benchmark.json');
const originalFetch = globalThis.fetch;
const createdUserIds = new Set();
const FIRST_IMPORT_OBSERVER_POLL_MS = 2;
const WORKER_OBSERVER_POLL_MS = 5;
const BENCHMARK_WORKER_POLL_MS = 5;

const blockedFetch = async (input) => {
  throw new Error(`Unexpected network request during ONB-007 benchmark: ${String(input)}`);
};

function assertDisposableDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required.');
  const url = new URL(raw);
  const databaseName = url.pathname.replace(/^\//, '');
  const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const disposableName = /(^|[_-])(ci|test|benchmark)([_-]|$)/i.test(databaseName);
  if (!localHost || !disposableName) {
    throw new Error(
      `ONB-007 benchmark requires a local disposable database with a ci, test, or benchmark name token; received ${url.hostname}/${databaseName}.`,
    );
  }
}

async function assertEmptyDatabase() {
  const [users, games, positions, jobs] = await Promise.all([
    prisma.appUser.count(),
    prisma.importedGame.count(),
    prisma.position.count(),
    prisma.jobRun.count(),
  ]);
  if (users || games || positions || jobs) {
    throw new Error(
      `ONB-007 benchmark requires an empty migrated database; found users=${users}, games=${games}, positions=${positions}, jobs=${jobs}.`,
    );
  }
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function generatePgn(targetPlies, seed, label) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const chess = new Chess();
    const random = createRng(seed + attempt * 7919);
    chess.header(
      'Event', `ONB-007 ${label}`,
      'Site', 'Disposable synthetic fixture',
      'Date', '2026.08.03',
      'Round', '-',
      'White', 'BenchmarkUser',
      'Black', 'BenchmarkOpponent',
      'Result', '*',
      'TimeControl', '600+0',
    );
    while (chess.history().length < targetPlies && !chess.isGameOver()) {
      const candidates = chess.moves({ verbose: true });
      const nonTerminal = candidates.filter((candidate) => {
        const probe = new Chess(chess.fen());
        probe.move(candidate);
        return !probe.isGameOver();
      });
      const pool = nonTerminal.length ? nonTerminal : candidates;
      chess.move(pool[Math.floor(random() * pool.length)]);
    }
    if (chess.history().length >= targetPlies) {
      return chess.pgn({ maxWidth: 0, newline: '\n' });
    }
  }
  throw new Error(`Could not generate a ${targetPlies}-ply benchmark PGN.`);
}

function rounded(value) {
  return Number(value.toFixed(3));
}

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return rounded(sorted[index]);
}

function summarize(values, unit) {
  if (!values.length) {
    return { unit, samples: 0, min: null, p50: null, p90: null, max: null, mean: null };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    unit,
    samples: values.length,
    min: rounded(Math.min(...values)),
    p50: percentile(values, 50),
    p90: percentile(values, 90),
    max: rounded(Math.max(...values)),
    mean: rounded(total / values.length),
  };
}

async function timed(operation) {
  const cpuBefore = process.cpuUsage();
  const rssBefore = process.memoryUsage().rss;
  const startedAt = performance.now();
  const result = await operation();
  const durationMs = performance.now() - startedAt;
  const cpu = process.cpuUsage(cpuBefore);
  return {
    result,
    durationMs,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
    rssDeltaBytes: process.memoryUsage().rss - rssBefore,
  };
}

async function createUserAndAccount(provider, label) {
  const suffix = `${label}-${randomUUID()}`;
  const user = await prisma.appUser.create({
    data: {
      displayName: `ONB-007 ${label}`,
      authProvider: 'benchmark',
      authSubject: suffix,
      email: `${suffix}@example.test`,
    },
  });
  createdUserIds.add(user.id);
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider,
      username: `bench-${suffix}`,
      displayName: `ONB-007 ${provider}`,
      isActive: true,
    },
  });
  return { user, account };
}

async function createImportedGame(userId, accountId, pgn, ordinal, provider = 'TEST') {
  const endedAt = new Date(Date.UTC(2026, 7, 3) + ordinal * 60_000);
  return prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider,
      providerGameId: `onb-007-${randomUUID()}`,
      providerUrl: `https://example.test/game/${randomUUID()}`,
      pgn,
      rated: true,
      variant: 'standard',
      speedCategory: 'rapid',
      timeControlRaw: '600+0',
      timeControlInitial: 600,
      timeControlIncrement: 0,
      startedAt: new Date(endedAt.getTime() - 20 * 60_000),
      endedAt,
      whiteUsername: 'BenchmarkUser',
      blackUsername: 'BenchmarkOpponent',
      whiteRating: 1600,
      blackRating: 1580,
      userColor: 'WHITE',
      opponentUsername: 'BenchmarkOpponent',
      result: '1-0',
      resultForUser: 'WIN',
      status: 'resign',
    },
  });
}

async function cleanupUsersAndPositions() {
  if (createdUserIds.size) {
    await prisma.appUser.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.clear();
  }
  await prisma.position.deleteMany({ where: { plies: { none: {} } } });
}

function buildLichessGames(count, pgn) {
  const baseTime = Date.UTC(2026, 7, 3);
  return Array.from({ length: count }, (_, index) => ({
    id: `onb007lichess${randomUUID().replaceAll('-', '')}${index}`,
    rated: true,
    variant: 'standard',
    speed: 'rapid',
    createdAt: baseTime + index * 60_000,
    lastMoveAt: baseTime + index * 60_000 + 20 * 60_000,
    status: 'resign',
    winner: 'white',
    pgn,
    clock: { initial: 600, increment: 0 },
    players: {
      white: { user: { name: 'BenchmarkUser' }, rating: 1600 },
      black: { user: { name: 'BenchmarkOpponent' }, rating: 1580 },
    },
    opening: { eco: 'A00', name: 'Synthetic opening' },
  }));
}

function buildChessComGames(count, pgn) {
  const baseSeconds = Math.floor(Date.UTC(2026, 7, 3) / 1000);
  return Array.from({ length: count }, (_, index) => ({
    uuid: `onb007-chesscom-${randomUUID()}-${index}`,
    url: `https://www.chess.com/game/live/${randomUUID().replaceAll('-', '')}`,
    pgn,
    time_control: '600+0',
    start_time: baseSeconds + index * 60,
    end_time: baseSeconds + index * 60 + 20 * 60,
    rated: true,
    time_class: 'rapid',
    rules: 'chess',
    white: { username: 'BenchmarkUser', rating: 1600, result: 'win' },
    black: { username: 'BenchmarkOpponent', rating: 1580, result: 'resigned' },
  }));
}

async function waitForFirstImportedGame(accountId, syncPromise, startedAt) {
  let settled = false;
  void syncPromise.then(
    () => { settled = true; },
    () => { settled = true; },
  );

  while (true) {
    const exists = await prisma.importedGame.findFirst({
      where: { accountId },
      select: { id: true },
    });
    if (exists) return performance.now() - startedAt;
    if (settled) return null;
    await new Promise((resolve) => setTimeout(resolve, FIRST_IMPORT_OBSERVER_POLL_MS));
  }
}

function startTimed(operation) {
  const cpuBefore = process.cpuUsage();
  const rssBefore = process.memoryUsage().rss;
  const startedAt = performance.now();
  const promise = Promise.resolve().then(operation);

  return {
    startedAt,
    promise,
    async finish() {
      const result = await promise;
      const durationMs = performance.now() - startedAt;
      const cpu = process.cpuUsage(cpuBefore);
      return {
        result,
        durationMs,
        cpuUserMs: cpu.user / 1000,
        cpuSystemMs: cpu.system / 1000,
        rssDeltaBytes: process.memoryUsage().rss - rssBefore,
      };
    },
  };
}

async function benchmarkProviderImport(provider, count, samples, pgn) {
  const duration = [];
  const firstCommitted = [];
  const perGame = [];
  const cpuUser = [];
  const cpuSystem = [];
  const rss = [];

  for (let sample = 0; sample < samples; sample += 1) {
    const { user, account } = await createUserAndAccount(provider, `${provider}-${count}-${sample}`);
    if (provider === 'LICHESS') {
      const games = buildLichessGames(count, pgn);
      globalThis.fetch = async () => new Response(
        `${games.map((game) => JSON.stringify(game)).join('\n')}\n`,
        { status: 200, headers: { 'content-type': 'application/x-ndjson' } },
      );
    } else {
      const games = buildChessComGames(count, pgn);
      const archiveUrl = `https://api.chess.com/pub/player/${account.username.toLowerCase()}/games/2026/08`;
      globalThis.fetch = async (input) => {
        const url = String(input);
        if (url.endsWith('/games/archives')) {
          return new Response(JSON.stringify({ archives: [archiveUrl] }), { status: 200 });
        }
        if (url === archiveUrl) {
          return new Response(JSON.stringify({ games }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      };
    }

    const timedImport = startTimed(() => (provider === 'LICHESS'
      ? LichessImportService.syncAccount(user.id, account.id)
      : ChessComImportService.syncAccount(user.id, account.id)));
    const firstPromise = waitForFirstImportedGame(
      account.id,
      timedImport.promise,
      timedImport.startedAt,
    );
    const measured = await timedImport.finish();
    const firstMs = await firstPromise;
    if (measured.result.gamesImported !== count) {
      throw new Error(`Expected ${count} ${provider} imports, got ${measured.result.gamesImported}.`);
    }
    duration.push(measured.durationMs);
    perGame.push(measured.durationMs / count);
    cpuUser.push(measured.cpuUserMs);
    cpuSystem.push(measured.cpuSystemMs);
    rss.push(measured.rssDeltaBytes);
    if (firstMs !== null) firstCommitted.push(firstMs);
    globalThis.fetch = blockedFetch;
    await cleanupUsersAndPositions();
  }

  return {
    provider,
    games: count,
    total: summarize(duration, 'ms'),
    firstCommittedGame: summarize(firstCommitted, 'ms'),
    perGame: summarize(perGame, 'ms/game'),
    cpuUser: summarize(cpuUser, 'ms'),
    cpuSystem: summarize(cpuSystem, 'ms'),
    rssDelta: summarize(rss, 'bytes'),
  };
}

async function createGames(userId, accountId, profile, count, seedStep = 31) {
  const gameIds = [];
  for (let index = 0; index < count; index += 1) {
    const pgn = generatePgn(profile.plies, profile.seed + index * seedStep, `${profile.name}-${index}`);
    const game = await createImportedGame(userId, accountId, pgn, index, 'LICHESS');
    gameIds.push(game.id);
  }
  return gameIds;
}

async function benchmarkIndexAndTags(profile) {
  const { user, account } = await createUserAndAccount('LICHESS', `index-${profile.name}`);
  const gameIds = await createGames(user.id, account.id, profile, profile.samples);
  const indexDurations = [];
  const tagDurations = [];
  const batchStartedAt = performance.now();
  let firstIndexedMs = null;

  for (const gameId of gameIds) {
    const measured = await timed(() => ImportedGameProcessingService.indexOne(
      user.id,
      gameId,
      { force: true },
    ));
    if (measured.result !== 'COMPLETED') throw new Error(`Index did not complete for ${gameId}.`);
    indexDurations.push(measured.durationMs);
    firstIndexedMs ??= performance.now() - batchStartedAt;
  }
  for (const gameId of gameIds) {
    const measured = await timed(() => ImportedGamesService.refreshTags(user.id, gameId));
    tagDurations.push(measured.durationMs);
  }

  const totalMs = indexDurations.reduce((sum, value) => sum + value, 0);
  const result = {
    profile: profile.name,
    plies: profile.plies,
    games: profile.samples,
    indexPerGame: summarize(indexDurations, 'ms/game'),
    indexBatchTotalMs: rounded(totalMs),
    indexGamesPerSecond: rounded(profile.samples / (totalMs / 1000)),
    firstIndexedGameMs: firstIndexedMs === null ? null : rounded(firstIndexedMs),
    refreshTagsPerGame: summarize(tagDurations, 'ms/game'),
  };
  await cleanupUsersAndPositions();
  return result;
}

async function benchmarkJobAdmission(count, samples, pgn) {
  const durations = [];
  for (let sample = 0; sample < samples; sample += 1) {
    const { user, account } = await createUserAndAccount('LICHESS', `admission-${count}-${sample}`);
    const gameIds = [];
    for (let index = 0; index < count; index += 1) {
      const game = await createImportedGame(user.id, account.id, pgn, index, 'LICHESS');
      gameIds.push(game.id);
    }
    const measured = await timed(() => JobRunService.createUserAction({
      userId: user.id,
      kind: 'INDEX_GAMES',
      importedGameIds: gameIds,
      force: false,
    }));
    if (measured.result.jobRun.totalTasks !== count) throw new Error('Job admission count mismatch.');
    durations.push(measured.durationMs);
    await cleanupUsersAndPositions();
  }
  return { games: count, createJobAndTasks: summarize(durations, 'ms') };
}

async function benchmarkAnalysis(profile) {
  const durations = [];
  const startup = [];
  const cpuUser = [];
  const cpuSystem = [];
  const rss = [];

  for (let sample = 0; sample < profile.samples; sample += 1) {
    const { user, account } = await createUserAndAccount('LICHESS', `analysis-${profile.name}-${sample}`);
    const [gameId] = await createGames(user.id, account.id, {
      ...profile,
      seed: profile.seed + sample * 97,
    }, 1);
    await ImportedGameProcessingService.indexOne(user.id, gameId, { force: true });

    const startupEngine = new WasmStockfishEngineService({ timeoutMs: 60_000 });
    try {
      const measured = await timed(() => startupEngine.analyzePosition(
        '8/8/8/8/8/8/4K3/6k1 w - - 0 1',
        { depth: profile.depth, multipv: 1 },
      ));
      startup.push(measured.durationMs);
    } finally {
      startupEngine.dispose();
    }

    const engine = new WasmStockfishEngineService({ timeoutMs: 60_000 });
    try {
      const measured = await timed(() => ImportedGameProcessingService.analyseOne(
        engine,
        user.id,
        gameId,
        {
          depth: profile.depth,
          multipv: 1,
          force: true,
          refreshTagsAfterAnalysis: true,
        },
      ));
      if (measured.result !== 'COMPLETED') throw new Error(`Analysis did not complete for ${gameId}.`);
      durations.push(measured.durationMs);
      cpuUser.push(measured.cpuUserMs);
      cpuSystem.push(measured.cpuSystemMs);
      rss.push(measured.rssDeltaBytes);
    } finally {
      engine.dispose();
    }
    await cleanupUsersAndPositions();
  }

  return {
    profile: profile.name,
    plies: profile.plies,
    depth: profile.depth,
    games: profile.samples,
    freshEngineFirstPosition: summarize(startup, 'ms'),
    analysisPerGame: summarize(durations, 'ms/game'),
    analysisPerPly: summarize(durations.map((value) => value / profile.plies), 'ms/ply'),
    cpuUser: summarize(cpuUser, 'ms'),
    cpuSystem: summarize(cpuSystem, 'ms'),
    rssDelta: summarize(rss, 'bytes'),
  };
}

async function benchmarkProcess(profile) {
  const durations = [];
  for (let sample = 0; sample < profile.samples; sample += 1) {
    const { user, account } = await createUserAndAccount('LICHESS', `process-${profile.name}-${sample}`);
    const [gameId] = await createGames(user.id, account.id, {
      ...profile,
      seed: profile.seed + sample * 131,
    }, 1);
    const engine = new WasmStockfishEngineService({ timeoutMs: 60_000 });
    try {
      const measured = await timed(() => ImportedGameProcessingService.processOne(
        engine,
        user.id,
        gameId,
        {
          depth: profile.depth,
          multipv: 1,
          force: true,
          refreshTagsAfterAnalysis: true,
        },
      ));
      if (measured.result !== 'COMPLETED') throw new Error(`Process did not complete for ${gameId}.`);
      durations.push(measured.durationMs);
    } finally {
      engine.dispose();
    }
    await cleanupUsersAndPositions();
  }
  return {
    profile: profile.name,
    plies: profile.plies,
    depth: profile.depth,
    games: profile.samples,
    processPerGame: summarize(durations, 'ms/game'),
  };
}

function isTerminal(status) {
  return status !== 'QUEUED' && status !== 'RUNNING';
}

async function runWorkerUntilTerminal(userId, jobRunId) {
  const worker = createJobWorker({
    repository: JobWorkerRepository,
    executors: defaultJobTaskExecutorRegistry,
    config: {
      pollIntervalMs: BENCHMARK_WORKER_POLL_MS,
      heartbeatIntervalMs: 1_000,
      staleAfterMs: 10_000,
      staleRecoveryIntervalMs: 5_000,
      terminalRetentionDays: 30,
      sliceSize: 25,
      shutdownTimeoutMs: 10_000,
    },
    logger: { info() {}, warn() {}, error(context, message) { console.error(message, context); } },
  });
  const startedAt = performance.now();
  let firstSettledMs = null;
  const runPromise = worker.run();
  try {
    while (true) {
      const run = await JobRunService.getForUser(userId, jobRunId);
      const settled = run.taskCounts.completed + run.taskCounts.skipped
        + run.taskCounts.failed + run.taskCounts.cancelled;
      if (settled > 0 && firstSettledMs === null) firstSettledMs = performance.now() - startedAt;
      if (isTerminal(run.status)) {
        return { run, firstSettledMs, totalMs: performance.now() - startedAt };
      }
      await new Promise((resolve) => setTimeout(resolve, WORKER_OBSERVER_POLL_MS));
    }
  } finally {
    worker.requestStop('ONB-007 benchmark complete.');
    await runPromise;
  }
}

async function benchmarkWorkerWave(input) {
  const firstSettled = [];
  const totals = [];
  if (input.kind === 'ANALYSE_GAMES') {
    process.env.STOCKFISH_ANALYSIS_DEPTH = String(input.depth ?? 12);
  }

  for (let sample = 0; sample < input.samples; sample += 1) {
    const { user, account } = await createUserAndAccount('LICHESS', `${input.kind}-${input.games}-${sample}`);
    const gameIds = await createGames(user.id, account.id, {
      name: `${input.kind}-${sample}`,
      plies: input.plies,
      seed: input.seed + sample * 193,
    }, input.games);
    if (input.kind === 'ANALYSE_GAMES') {
      for (const gameId of gameIds) {
        await ImportedGameProcessingService.indexOne(user.id, gameId, { force: true });
      }
    }
    const created = await JobRunService.createUserAction({
      userId: user.id,
      kind: input.kind,
      importedGameIds: gameIds,
      force: true,
    });
    const result = await runWorkerUntilTerminal(user.id, created.jobRun.id);
    if (result.run.taskCounts.failed || result.run.taskCounts.cancelled) {
      throw new Error(`${input.kind} worker wave did not settle cleanly.`);
    }
    if (result.firstSettledMs !== null) firstSettled.push(result.firstSettledMs);
    totals.push(result.totalMs);
    await cleanupUsersAndPositions();
  }
  return {
    kind: input.kind,
    games: input.games,
    plies: input.plies,
    depth: input.depth ?? null,
    firstSettled: summarize(firstSettled, 'ms'),
    waveTotal: summarize(totals, 'ms'),
    workerPollIntervalMs: BENCHMARK_WORKER_POLL_MS,
    observerPollIntervalMs: WORKER_OBSERVER_POLL_MS,
    jobQueuedBeforeWorkerStart: true,
  };
}

async function cleanup() {
  globalThis.fetch = originalFetch;
  await cleanupUsersAndPositions();
}

assertDisposableDatabase();
await assertEmptyDatabase();
globalThis.fetch = blockedFetch;
process.env.LOCAL_BATCH_STOCKFISH_ANALYSIS_ENABLED = 'true';
process.env.STOCKFISH_ENGINE = 'wasm';
process.env.STOCKFISH_ANALYSIS_DEPTH = '12';
process.env.STOCKFISH_ANALYSIS_TIMEOUT_MS = '60000';

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  environment: {
    gitSha: process.env.GITHUB_SHA ?? null,
    runnerName: process.env.RUNNER_NAME ?? null,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpuModel: os.cpus()[0]?.model ?? null,
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    database: 'Fresh local disposable PostgreSQL; credentials omitted',
    engine: 'stockfish npm WASM worker',
    analysisMultipv: 1,
    firstImportObserverPollMs: FIRST_IMPORT_OBSERVER_POLL_MS,
    benchmarkWorkerPollMs: BENCHMARK_WORKER_POLL_MS,
    workerObserverPollMs: WORKER_OBSERVER_POLL_MS,
  },
  limitations: [
    'Synthetic provider responses remove internet latency, rate limits, retries, and archive/window variability.',
    'CI PostgreSQL is local to the runner and is not Neon network latency or production data volume.',
    'WASM depth-12 is not the documented local-binary Render worker and must not be converted directly into a public production ETA.',
    'The preparation parent/reconciler is not implemented yet; end-to-end onboarding is modelled from provider, admission, worker, and service measurements.',
    'CPU and RSS deltas are process-level observations on a shared hosted runner, not isolated resource accounting.',
    'First-import timing is observed by a 2 ms database poll that adds observer latency and some local database load.',
    'Worker-wave timing starts after the job is queued and immediately starts an in-process worker, so arbitrary idle poll, deployment wake, and external queue delay are excluded.',
  ],
  results: {},
};

try {
  const mediumPgn = generatePgn(40, 7001, 'import-medium');
  report.results.import = [];
  for (const provider of ['LICHESS', 'CHESS_COM']) {
    for (const count of [10, 50, 200]) {
      report.results.import.push(await benchmarkProviderImport(provider, count, 5, mediumPgn));
    }
  }

  report.results.jobAdmission = [];
  for (const count of [10, 50, 200]) {
    report.results.jobAdmission.push(await benchmarkJobAdmission(count, 5, mediumPgn));
  }

  report.results.indexAndTags = [];
  for (const profile of [
    { name: 'short', plies: 16, samples: 12, seed: 1100 },
    { name: 'medium', plies: 40, samples: 12, seed: 2200 },
    { name: 'long', plies: 80, samples: 12, seed: 3300 },
  ]) {
    report.results.indexAndTags.push(await benchmarkIndexAndTags(profile));
  }

  report.results.analysis = [];
  for (const profile of [
    { name: 'short-depth-1', plies: 16, depth: 1, samples: 5, seed: 4400 },
    { name: 'medium-depth-1', plies: 40, depth: 1, samples: 5, seed: 5500 },
    { name: 'short-depth-12', plies: 16, depth: 12, samples: 3, seed: 6600 },
    { name: 'medium-depth-12', plies: 40, depth: 12, samples: 3, seed: 7700 },
  ]) {
    report.results.analysis.push(await benchmarkAnalysis(profile));
  }

  report.results.process = await benchmarkProcess({
    name: 'medium-depth-12',
    plies: 40,
    depth: 12,
    samples: 3,
    seed: 8800,
  });

  report.results.workerWaves = [];
  report.results.workerWaves.push(await benchmarkWorkerWave({
    kind: 'INDEX_GAMES', games: 50, plies: 40, samples: 3, seed: 9900,
  }));
  report.results.workerWaves.push(await benchmarkWorkerWave({
    kind: 'ANALYSE_GAMES', games: 3, plies: 16, depth: 12, samples: 3, seed: 11100,
  }));

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await cleanup();
  await prisma.$disconnect();
}
