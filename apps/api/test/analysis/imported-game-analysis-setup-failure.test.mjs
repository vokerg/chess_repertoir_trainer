import assert from 'node:assert/strict';
import {
  createImportedGameAnalysisExecutionService,
} from '../../dist/modules/analysis/imported-game-analysis-execution.service.js';

const created = [];
const failed = [];
const service = createImportedGameAnalysisExecutionService({
  analyseOne: async () => {
    throw new Error('analyseOne must not run when recording setup failure');
  },
  refreshTags: async () => {},
  getExecutionState: async (userId, importedGameId) => {
    assert.equal(userId, 5);
    assert.equal(importedGameId, 9);
    return {
      totalPlies: 42,
      analysedPlies: 7,
      maxRunId: 12,
      latest: null,
      hasOtherCurrentRunAtLatestTimestamp: false,
    };
  },
  findAbortCleanupCandidate: async () => null,
  abandonRun: async () => true,
  createRunningRun: async (input) => {
    created.push(input);
    return { id: 13 };
  },
  failRun: async (runId, error) => {
    failed.push({ runId, error });
    return { id: runId, status: 'FAILED' };
  },
});

await service.recordSetupFailure(5, 9, new Error('Local batch Stockfish analysis is disabled'));
assert.deepEqual(created, [{
  importedGameId: 9,
  positionsTotal: 42,
  positionsDone: 7,
}]);
assert.deepEqual(failed, [{
  runId: 13,
  error: 'Local batch Stockfish analysis is disabled',
}]);

const missingGameService = createImportedGameAnalysisExecutionService({
  analyseOne: async () => 'COMPLETED',
  refreshTags: async () => {},
  getExecutionState: async () => null,
  findAbortCleanupCandidate: async () => null,
  abandonRun: async () => true,
  createRunningRun: async () => ({ id: 1 }),
  failRun: async () => ({ id: 1 }),
});
await assert.rejects(
  missingGameService.recordSetupFailure(5, 404, new Error('engine failed')),
  /Imported game not found/,
);

console.log('Imported-game analysis setup-failure persistence tests passed.');
