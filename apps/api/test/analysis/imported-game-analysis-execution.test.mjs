import assert from 'node:assert/strict';
import {
  createImportedGameAnalysisExecutionService,
} from '../../dist/modules/analysis/imported-game-analysis-execution.service.js';

const engine = {};
const baseOptions = {
  depth: 12,
  multipv: 1,
  force: false,
  refreshTagsAfterAnalysis: true,
};

{
  let analyseCalls = 0;
  let refreshCalls = 0;
  const service = createImportedGameAnalysisExecutionService({
    analyseOne: async () => {
      analyseCalls += 1;
      return 'COMPLETED';
    },
    refreshTags: async () => {
      refreshCalls += 1;
    },
    getExecutionState: async () => ({
      totalPlies: 20,
      maxRunId: 4,
      latest: {
        id: 4,
        status: 'COMPLETED',
        positionsTotal: 20,
        positionsDone: 20,
        createdAt: new Date('2026-07-17T06:00:00.000Z'),
      },
      hasOtherCurrentRunAtLatestTimestamp: false,
    }),
    findAbortCleanupCandidate: async () => null,
    abandonRun: async () => true,
  });

  assert.equal(await service.analyseOne(engine, 1, 2, baseOptions), 'SKIPPED');
  assert.equal(analyseCalls, 0, 'deterministically current work does not reach Stockfish');
  assert.equal(refreshCalls, 1, 'idempotent analysis still repairs tags');
}

{
  let receivedOptions;
  const service = createImportedGameAnalysisExecutionService({
    analyseOne: async (_engine, _userId, _gameId, options) => {
      receivedOptions = options;
      return 'COMPLETED';
    },
    refreshTags: async () => {},
    getExecutionState: async () => ({
      totalPlies: 20,
      maxRunId: 8,
      latest: {
        id: 8,
        status: 'FAILED',
        positionsTotal: 20,
        positionsDone: 5,
        createdAt: new Date('2026-07-17T06:01:00.000Z'),
      },
      hasOtherCurrentRunAtLatestTimestamp: true,
    }),
    findAbortCleanupCandidate: async () => null,
    abandonRun: async () => true,
  });

  assert.equal(await service.analyseOne(engine, 1, 2, baseOptions), 'COMPLETED');
  assert.equal(receivedOptions.force, true, 'an equal-timestamp older current run cannot cause a false skip');
}

{
  const controller = new AbortController();
  let cleanupInput;
  let abandonedRunId = null;
  const service = createImportedGameAnalysisExecutionService({
    analyseOne: async () => {
      controller.abort(new Error('Worker received SIGTERM.'));
      throw new Error('Local Stockfish disposed');
    },
    refreshTags: async () => {},
    getExecutionState: async () => ({
      totalPlies: 20,
      maxRunId: 10,
      latest: null,
      hasOtherCurrentRunAtLatestTimestamp: false,
    }),
    findAbortCleanupCandidate: async (input) => {
      cleanupInput = input;
      return 11;
    },
    abandonRun: async (runId) => {
      abandonedRunId = runId;
      return true;
    },
  });

  await assert.rejects(
    service.analyseOne(engine, 1, 2, { ...baseOptions, signal: controller.signal }),
    /Local Stockfish disposed/,
  );
  assert.equal(cleanupInput.afterRunId, 10);
  assert.equal(cleanupInput.error, 'Local Stockfish disposed');
  assert.equal(abandonedRunId, 11, 'controlled abort attempts are abandoned before the task is requeued');
}

{
  let analyseCalls = 0;
  const controller = new AbortController();
  controller.abort(new Error('Worker received SIGTERM.'));
  const service = createImportedGameAnalysisExecutionService({
    analyseOne: async () => {
      analyseCalls += 1;
      return 'COMPLETED';
    },
    refreshTags: async () => {},
    getExecutionState: async () => {
      throw new Error('state lookup should not run');
    },
    findAbortCleanupCandidate: async () => null,
    abandonRun: async () => true,
  });

  await assert.rejects(
    service.analyseOne(engine, 1, 2, { ...baseOptions, signal: controller.signal }),
    /Worker received SIGTERM/,
  );
  assert.equal(analyseCalls, 0, 'pre-aborted work does not perform reads or analysis');
}

{
  let cleanupCalls = 0;
  const service = createImportedGameAnalysisExecutionService({
    analyseOne: async () => {
      throw new Error('PGN is invalid');
    },
    refreshTags: async () => {},
    getExecutionState: async () => ({
      totalPlies: 20,
      maxRunId: 12,
      latest: null,
      hasOtherCurrentRunAtLatestTimestamp: false,
    }),
    findAbortCleanupCandidate: async () => {
      cleanupCalls += 1;
      return 13;
    },
    abandonRun: async () => true,
  });

  await assert.rejects(
    service.analyseOne(engine, 1, 2, baseOptions),
    /PGN is invalid/,
  );
  assert.equal(cleanupCalls, 0, 'ordinary domain failures remain failed analysis attempts');
}

console.log('Imported-game guarded analysis execution tests passed.');
