import assert from 'node:assert/strict';
import {
  createImportedGameAnalysisExecutionService,
} from '../../dist/modules/analysis/imported-game-analysis-execution.service.js';

const recorded = [];
const service = createImportedGameAnalysisExecutionService({
  analyseOne: async () => {
    throw new Error('analyseOne must not run when recording setup failure');
  },
  refreshTags: async () => {},
  getExecutionState: async () => {
    throw new Error('setup-failure persistence owns its currentness check atomically');
  },
  findAbortCleanupCandidate: async () => null,
  abandonRun: async () => true,
  recordFailedRun: async (input) => {
    recorded.push(input);
    return { id: 13, status: 'FAILED' };
  },
});

await service.recordSetupFailure(5, 9, false, new Error('Local batch Stockfish analysis is disabled'));
assert.deepEqual(recorded, [{
  userId: 5,
  importedGameId: 9,
  force: false,
  error: 'Local batch Stockfish analysis is disabled',
}]);

await service.recordSetupFailure(5, 9, true, new Error('forced refresh failed'));
assert.deepEqual(recorded[1], {
  userId: 5,
  importedGameId: 9,
  force: true,
  error: 'forced refresh failed',
});

const unconfiguredService = createImportedGameAnalysisExecutionService({
  analyseOne: async () => 'COMPLETED',
  refreshTags: async () => {},
  getExecutionState: async () => null,
  findAbortCleanupCandidate: async () => null,
  abandonRun: async () => true,
});
await assert.rejects(
  unconfiguredService.recordSetupFailure(5, 404, false, new Error('engine failed')),
  /setup-failure persistence is not configured/,
);

console.log('Imported-game analysis setup-failure persistence tests passed.');
