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

const prisma = prismaModule.default;
const reportPath = process.env.ONBOARDING_BENCHMARK_REPORT_PATH
  ?? path.resolve(process.cwd(), 'onboarding-throughput-benchmark.json');
const originalFetch = globalThis.fetch;
const createdUserIds = new Set();

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
      'Site', 'CI synthetic fixture',
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
      const pool = nonTerminal.length > 0 ? nonTerminal : candidates;
      const candidate = pool[Math.floor(random() * pool.length)];
      chess.move(candidate);
    }

    if (chess.history().length >= targetPlies) {
      return chess.pgn({ maxWidth: 0, newline: '\n' });
    }
  }
  throw new Error(`Could not generate a ${targetPlies}-ply benchmark PGN.`);
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(3));
}

function summarize(values) {
  if (values.length === 0) {
    return { samples: 0, minMs: null, p50Ms: null, p90Ms: null, maxMs: null, meanMs: null };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    samples: values.length,
    minMs: Number(Math.min(...values).toFixed(3)),
    p50Ms: percentile(values, 50),
    p90Ms: percentile(values, 90),
    maxMs: Number(Math.max(...values).toFixed(3)),
    meanMs: Number((total / values.length).toFixed(3)),
  };
}

async function timed(operation) {
  const cpuBefore = process.cpuUsage();
  const rssBefore = process.memoryUsage().rss;
  const startedAt = performance.now();
  const result = await operation();
  const durationMs = performance.now() - startedAt;
  const cpu = process.cpuUsage(cpuBefore);
  const rssAfter = process.memoryUsage().rss;
  return {
    result,
    durationMs,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
    rssDeltaBytes: rssAfter - rssBefore,
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
  const endedAt = new Date(Date.UTC(2026, 7, 3, 0, 0, 0) + ordinal * 60_000);
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

function buildLichessGames(count, pgn) {
  const baseTime = Date.UTC(2026, 7, 3, 0, 0, 0);
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
  const baseSeconds = Math.floor(Date.UTC(2026, 7, 3, 0, 0, 0) / 1000);
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

async function waitForFirstImportedGame(accountId, syncPromise) {
  const startedAt = performance.now();
  let settled = false;
  void syncPromise.finally(() => {
    settled = true;
  });

  while (!settled) {
    const exists = await prisma.importedGame.findFirst({
      where: { accountId },
      select: { id: true },
    });
    if (exists) return performance.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  return null;
}

async function benchmarkLichessImport(count, samples, pgn) {
  const durations = [];
  const firstRowDurations = [];
  const cpuUser = [];
  const rssDeltas = [];

  for (let sample = 0; sample < samples; sample += 1) {
    const { user, account } = await createUserAndAccount('LICHESS', `lichess-${count}-${sample}`);
    const games = buildLichessGames(count, pgn);
    globalThis.fetch = async () => new Response(
      `${games.map((game) => JSON.stringify(game)).join('\n')}\n`,
      { status: 200, headers: { 'content-type': 'application/x-ndjson' } },
    );

    const syncPromise = LichessImportService.syncAccount(user.id, account.id);
    const firstRowPromise = waitForFirstImportedGame(account.id, syncPromise);
    const measured = await timed(() => syncPromise);
    const firstRowMs = await firstRowPromise;
    durations.push(measured.durationMs);
    cpuUser.push(measured.cpuUserMs);
    rssDeltas.push(measured.rssDeltaBytes);
    if (firstRowMs !== null) firstRowDurations.push(firstRowMs);
    if (measured.result.gamesImported !== count) {
      throw new Error(`Expected ${count} Lichess imports, got ${measured.result.gamesImported}.`);
    }
    await prisma.appUser.delete({ where: { id: user.id } });
    createdUserIds.delete(user.id);
  }

  return {
    count,
    total: summarize(durations),
    firstCommittedGame: summarize(firstRowDurations),
    perGameMs: summarize(durations.map((value) => value / count)),
    cpuUserMs: summarize(cpuUser),
    rssDeltaBytes: summarize(rssDeltas),
  };
}

async function benchmarkChessComImport(count, samples, pgn) {
  const durations = [];
  const firstRowDurations = [];
  const cpuUser = [];
  const rssDeltas = [];

  for (let sample = 0; sample < samples; sample += 1) {
    const { user, account } = await createUserAndAccount('CHESS_COM', `chesscom-${count}-${sample}`);
    const games = buildChessComGames(count, pgn);
    const archiveUrl = `https://api.chess.com/pub/player/${account.username.toLowerCase()}/games/2026/08`;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/games/archives')) {
        return new Response(JSON.stringify({ archives: [archiveUrl] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === archiveUrl) {
        return new Response(JSON.stringify({ games }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    };

    const syncPromise = ChessComImportService.syncAccount(user.id, account.id);
    const firstRowPromise = waitForFirstImportedGame(account.id, syncPromise);
    const measured = await timed(() => syncPromise);
    const firstRowMs = await firstRowPromise;
    durations.push(measured.durationMs);
    cpuUser.push(measured.cpuUserMs);
    rssDeltas.push(measured.rssDeltaBytes);
    if (firstRowMs !== null) firstRowDurations.push(firstRowMs);
    if (measured.result.gamesImported !== count) {
      throw new Error(`Expected ${count} Chess.com imports, got ${measured.result.gamesImported}.`);
    }
    await prisma.appUser.delete({ where: { id: user.id } });
    createdUserIds.delete(user.id);
  }

  return {
    count,
    total: summarize(durations),
    firstCommittedGame: summarize(firstRowDurations),
    perGameMs: summarize(durations.map((value) => value / count)),
    cpuUserMs: summarize(cpuUser),
    rssDeltaBytes: summarize(rssDeltas),
  };
}

async function benchmarkIndexAndTags(profile) {
  const { user, account } = await createUserAndAccount('LICHESS', `index-${profile.name}`);
  const gameIds = [];
  for (let index = 0; index < profile.samples; index += 1) {
    const pgn = generatePgn(profile.plies, profile.seed + index * 31, `${profile.name}-${index}`);
    const game = await createImportedGame(user.id, account.id, pgn, index, 'LICHESS');
    gameIds.push(game.id);
  }

  const indexDurations = [];
  const tagDurations = [];
  let firstIndexedMs = null;
  const batchStartedAt = performance.now();
  for (const gameId of gameIds) {
    const measured = await timed(() => ImportedGameProcessingService.indexOne(
      user.id,
      gameId,
      { force: true },
    ));
    if (measured.result !== 'COMPLETED') {
      throw new Error(`Expected index completion for game ${gameId}, got ${measured.result}.`);
    }
    indexDurations.push(measured.durationMs);
    firstIndexedMs ??= performance.now() - batchStartedAt;
  }

  for (const gameId of gameIds) {
    const measured = await timed(() => ImportedGamesService.refreshTags(user.id, gameId));
    tagDurations.push(measured.durationMs);
  }

  await prisma.appUser.delete({ where: { id: user.id } });
  createdUserIds.delete(user.id);

  return {
    profile: profile.name,
    plies: profile.plies,
    games: profile.samples,
    indexPerGame: summarize(indexDurations),
    indexBatchTotalMs: Number(indexDurations.reduce((sum, value) => sum + value, 0).toFixed(3)),
    indexGamesPerSecond: Number((profile.samples / (indexDurations.reduce((sum, value) => sum + value, 0) / 1000)).toFixed(3)),
    firstIndexedGameMs: firstIndexedMs === null ? null : Number(firstIndexedMs.toFixed(3)),
    refreshTagsPerGame: summarize(tagDurations),
  };
}

async function benchmarkAnalysis(profile) {
  const durations = [];
  const engineOnlyFirstPositionDurations = [];
  const cpuUser = [];
  const rssDeltas = [];

  for (let sample = 0; sample < profile.samples; sample += 1) {
    const { user, account } = await createUserAndAccount('LICHESS', `analysis-${profile.name}-${sample}`);
    const pgn = generatePgn(profile.plies, profile.seed + sample * 97, `${profile.name}-${sample}`);
    const game = await createImportedGame(user.id, account.id, pgn, sample, 'LICHESS');
    await ImportedGameProcessingService.indexOne(user.id, game.id, { force: true });

    const startupEngine = new WasmStockfishEngineService({ timeoutMs: 30_000 });
    try {
      const measuredStartup = await timed(() => startupEngine.analyzePosition(
        '8/8/8/8/8/8/4K3/6k1 w - - 0 1',
        { depth: profile.depth, multipv: 1 },
      ));
      engineOnlyFirstPositionDurations.push(measuredStartup.durationMs);
    } finally {
      startupEngine.dispose();
    }

    const engine = new WasmStockfishEngineService({ timeoutMs: 30_000 });
    try {
      const measured = await timed(() => ImportedGameProcessingService.analyseOne(
        engine,
        user.id,
        game.id,
        {
          depth: profile.depth,
          multipv: 1,
          force: true,
          refreshTagsAfterAnalysis: true,
        },
      ));
      if (measured.result !== 'COMPLETED') {
        throw new Error(`Expected analysis completion for game ${game.id}, got ${measured.result}.`);
      }
      durations.push(measured.durationMs);
      cpuUser.push(measured.cpuUserMs);
      rssDeltas.push(measured.rssDeltaBytes);
    } finally {
      engine.dispose();
    }

    await prisma.appUser.delete({ where: { id: user.id } });
    createdUserIds.delete(user.id);
  }

  return {
    profile: profile.name,
    plies: profile.plies,
    depth: profile.depth,
    games: profile.samples,
    freshEngineFirstPosition: summarize(engineOnlyFirstPositionDurations),
    analysisPerGame: summarize(durations),
    analysisMsPerPly: summarize(durations.map((value) => value / profile.plies)),
    cpuUserMs: summarize(cpuUser),
    rssDeltaBytes: summarize(rssDeltas),
  };
}

async function benchmarkProcess(profile) {
  const durations = [];
  for (let sample = 0; sample < profile.samples; sample += 1) {
    const { user, account } = await createUserAndAccount('LICHESS', `process-${profile.name}-${sample}`);
    const pgn = generatePgn(profile.plies, profile.seed + sample * 131, `${profile.name}-${sample}`);
    const game = await createImportedGame(user.id, account.id, pgn, sample, 'LICHESS');
    const engine = new WasmStockfishEngineService({ timeoutMs: 30_000 });
    try {
      const measured = await timed(() => ImportedGameProcessingService.processOne(
        engine,
        user.id,
        game.id,
        {
          depth: profile.depth,
          multipv: 1,
          force: true,
          refreshTagsAfterAnalysis: true,
        },
      ));
      if (measured.result !== 'COMPLETED') {
        throw new Error(`Expected process completion for game ${game.id}, got ${measured.result}.`);
      }
      durations.push(measured.durationMs);
    } finally {
      engine.dispose();
    }
    await prisma.appUser.delete({ where: { id: user.id } });
    createdUserIds.delete(user.id);
  }
  return {
    profile: profile.name,
    plies: profile.plies,
    depth: profile.depth,
    games: profile.samples,
    processPerGame: summarize(durations),
  };
}

async function cleanup() {
  globalThis.fetch = originalFetch;
  if (createdUserIds.size > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    createdUserIds.clear();
  }
  await prisma.mastersExplorerCache.deleteMany();
  await prisma.positionAnalysis.deleteMany();
  await prisma.position.deleteMany();
}

const report = {
  schemaVersion: 1,
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
    database: 'PostgreSQL via DATABASE_URL; credentials omitted',
    engine: 'stockfish npm WASM worker',
    analysisMultipv: 1,
  },
  limitations: [
    'Synthetic provider responses remove internet latency and rate limits.',
    'CI PostgreSQL is local to the runner and is not Neon latency.',
    'WASM depth-1/depth-4 measurements do not predict local Stockfish depth-12 production time.',
    'The current repository does not yet implement the ONB-003 preparation parent/reconciler, so end-to-end onboarding orchestration is modelled from component measurements rather than directly timed.',
  ],
  results: {},
};

try {
  const importPgn = generatePgn(40, 7001, 'import-medium');
  report.results.import = {
    lichess: [],
    chessCom: [],
  };
  for (const count of [10, 50, 200]) {
    report.results.import.lichess.push(await benchmarkLichessImport(count, 5, importPgn));
    report.results.import.chessCom.push(await benchmarkChessComImport(count, 5, importPgn));
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
    { name: 'short-depth-4', plies: 16, depth: 4, samples: 5, seed: 6600 },
  ]) {
    report.results.analysis.push(await benchmarkAnalysis(profile));
  }

  report.results.process = await benchmarkProcess({
    name: 'medium-depth-1',
    plies: 40,
    depth: 1,
    samples: 5,
    seed: 7700,
  });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await cleanup();
  await prisma.$disconnect();
}
