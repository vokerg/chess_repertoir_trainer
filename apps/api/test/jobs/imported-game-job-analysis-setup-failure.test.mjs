import assert from 'node:assert/strict';
import {
  createImportedGameJobTaskExecutorRegistry,
} from '../../dist/modules/jobs/imported-game-job-executors.js';

const setupFailures = [];
let engineCreated = false;
let analyseCalls = 0;
const registry = createImportedGameJobTaskExecutorRegistry({
  processing: {
    indexOne: async () => 'SKIPPED',
    analyseOne: async () => {
      analyseCalls += 1;
      return 'COMPLETED';
    },
    processOne: async () => 'COMPLETED',
  },
  refreshTags: async () => {},
  recordAnalysisSetupFailure: async (userId, importedGameId, force, error) => {
    setupFailures.push({
      userId,
      importedGameId,
      force,
      error: error instanceof Error ? error.message : String(error),
    });
  },
  loadAnalysisConfig: () => ({
    enabled: false,
    engine: 'local',
    stockfishPath: 'stockfish',
    depth: 15,
    multipv: 1,
    timeoutMs: 10_000,
  }),
  createEngine: () => {
    engineCreated = true;
    throw new Error('engine must not be created while disabled');
  },
});

await assert.rejects(
  registry.get('ANALYSE_GAMES').execute({
    id: 1,
    jobRunId: 2,
    userId: 5,
    kind: 'ANALYSE_GAMES',
    priority: 190,
    importedGameId: 9,
    ordinal: 0,
    force: false,
    workKey: 'GAME_WORK:setup-failure',
  }, {
    signal: new AbortController().signal,
  }),
  /disabled/,
);

assert.equal(engineCreated, false);
assert.equal(analyseCalls, 0);
assert.deepEqual(setupFailures, [{
  userId: 5,
  importedGameId: 9,
  force: false,
  error: 'Local batch Stockfish analysis is disabled',
}]);

console.log('Imported-game analysis job setup-failure tests passed.');
