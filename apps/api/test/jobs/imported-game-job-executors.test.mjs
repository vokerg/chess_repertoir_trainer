import assert from 'node:assert/strict';
import {
  createImportedGameJobTaskExecutorRegistry,
} from '../../dist/modules/jobs/imported-game-job-executors.js';

const enabledConfig = {
  enabled: true,
  engine: 'local',
  stockfishPath: 'stockfish',
  depth: 15,
  multipv: 1,
  timeoutMs: 10_000,
};

{
  const calls = [];
  let disposeCount = 0;
  const engine = {
    init: async () => {},
    analyzePosition: async () => ({}),
    dispose() { disposeCount += 1; },
  };
  const registry = createImportedGameJobTaskExecutorRegistry({
    processing: {
      indexOne: async (userId, gameId, options) => {
        calls.push(['index', userId, gameId, options.force, options.signal]);
        return 'SKIPPED';
      },
      analyseOne: async (receivedEngine, userId, gameId, options) => {
        calls.push(['analyse', receivedEngine, userId, gameId, options]);
        return 'COMPLETED';
      },
      processOne: async (receivedEngine, userId, gameId, options) => {
        calls.push(['process', receivedEngine, userId, gameId, options]);
        return 'COMPLETED';
      },
    },
    refreshTags: async (userId, gameId) => {
      calls.push(['tags', userId, gameId]);
    },
    loadAnalysisConfig: () => enabledConfig,
    createEngine: () => engine,
  });

  assert.deepEqual(registry.supportedKinds(), [
    'INDEX_GAMES',
    'ANALYSE_GAMES',
    'PROCESS_GAMES',
    'REFRESH_TAGS',
  ]);

  const controller = new AbortController();
  assert.equal(
    await registry.get('INDEX_GAMES').execute(task('INDEX_GAMES', true), { signal: controller.signal }),
    'SKIPPED',
  );
  assert.equal(
    await registry.get('ANALYSE_GAMES').execute(task('ANALYSE_GAMES', false), { signal: controller.signal }),
    'COMPLETED',
  );
  assert.equal(
    await registry.get('PROCESS_GAMES').execute(task('PROCESS_GAMES', true), { signal: controller.signal }),
    'COMPLETED',
  );
  assert.equal(
    await registry.get('REFRESH_TAGS').execute(task('REFRESH_TAGS', false), { signal: controller.signal }),
    'COMPLETED',
  );

  assert.deepEqual(calls[0].slice(0, 4), ['index', 5, 9, true]);
  assert.equal(calls[1][0], 'analyse');
  assert.equal(calls[1][1], engine);
  assert.equal(calls[1][4].depth, 15);
  assert.equal(calls[1][4].force, false);
  assert.equal(calls[1][4].refreshTagsAfterAnalysis, true);
  assert.equal(calls[2][0], 'process');
  assert.equal(calls[2][4].force, true);
  assert.deepEqual(calls[3], ['tags', 5, 9]);
  assert.equal(disposeCount, 2, 'each engine-backed task owns and disposes one engine');
}

{
  let engineCreated = false;
  const registry = createImportedGameJobTaskExecutorRegistry({
    processing: {
      indexOne: async () => 'SKIPPED',
      analyseOne: async () => 'COMPLETED',
      processOne: async () => 'COMPLETED',
    },
    refreshTags: async () => {},
    loadAnalysisConfig: () => ({ ...enabledConfig, enabled: false }),
    createEngine: () => {
      engineCreated = true;
      throw new Error('should not create engine');
    },
  });

  await assert.rejects(
    registry.get('ANALYSE_GAMES').execute(task('ANALYSE_GAMES', false), {
      signal: new AbortController().signal,
    }),
    /disabled/,
  );
  assert.equal(engineCreated, false);
}

{
  let executionStartedResolve;
  const executionStarted = new Promise((resolve) => {
    executionStartedResolve = resolve;
  });
  let disposeCount = 0;
  const engine = {
    init: async () => {},
    analyzePosition: async () => ({}),
    dispose() { disposeCount += 1; },
  };
  const registry = createImportedGameJobTaskExecutorRegistry({
    processing: {
      indexOne: async () => 'SKIPPED',
      analyseOne: async (_engine, _userId, _gameId, options) => {
        executionStartedResolve();
        await new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        });
        return 'COMPLETED';
      },
      processOne: async () => 'COMPLETED',
    },
    refreshTags: async () => {},
    loadAnalysisConfig: () => enabledConfig,
    createEngine: () => engine,
  });

  const controller = new AbortController();
  const execution = registry.get('ANALYSE_GAMES').execute(task('ANALYSE_GAMES', false), {
    signal: controller.signal,
  });
  await executionStarted;
  controller.abort(new Error('stop executor'));
  await assert.rejects(execution, /stop executor/);
  assert.equal(disposeCount, 1, 'abort and cleanup share one idempotent engine disposal');
}

console.log('Imported-game job executor tests passed.');

function task(kind, force) {
  return {
    id: 1,
    jobRunId: 2,
    userId: 5,
    kind,
    priority: 300,
    importedGameId: 9,
    ordinal: 0,
    force,
    workKey: 'GAME_WORK:test',
  };
}
