import assert from 'node:assert/strict';
import {
  createImportedGameProcessingService,
} from '../../dist/modules/imported-games/imported-game-processing.service.js';

const engine = { init: async () => {}, analyzePosition: async () => ({}), dispose() {} };

{
  const calls = [];
  const service = createImportedGameProcessingService({
    indexOne: async (userId, gameId, options) => {
      calls.push(['index', userId, gameId, options.force]);
      return { importedGameId: gameId, status: 'INDEXED' };
    },
    assignMissingOpening: async (userId, gameId) => {
      calls.push(['opening', userId, gameId]);
      return { importedGameId: gameId, status: 'SKIPPED', reason: 'NO_OPENING_MATCH' };
    },
    analyseOne: async () => 'SKIPPED',
  });

  assert.equal(await service.indexOne(7, 11, { force: true }), 'COMPLETED');
  assert.deepEqual(calls, [
    ['index', 7, 11, true],
    ['opening', 7, 11],
  ]);
}

{
  const service = createImportedGameProcessingService({
    indexOne: async (_userId, gameId) => ({ importedGameId: gameId, status: 'ALREADY_INDEXED' }),
    assignMissingOpening: async (_userId, gameId) => ({
      importedGameId: gameId,
      status: 'SKIPPED',
      reason: 'OPENING_ALREADY_PRESENT',
    }),
    analyseOne: async () => 'SKIPPED',
  });

  assert.equal(await service.indexOne(1, 2, { force: false }), 'SKIPPED');
  assert.equal(await service.processOne(engine, 1, 2, {
    depth: 12,
    multipv: 1,
    force: false,
    refreshTagsAfterAnalysis: true,
  }), 'SKIPPED');
}

{
  const analysisOptions = [];
  const service = createImportedGameProcessingService({
    indexOne: async (_userId, gameId) => ({ importedGameId: gameId, status: 'ALREADY_INDEXED' }),
    assignMissingOpening: async (_userId, gameId) => ({
      importedGameId: gameId,
      status: 'SKIPPED',
      reason: 'OPENING_ALREADY_PRESENT',
    }),
    analyseOne: async (_engine, _userId, _gameId, options) => {
      analysisOptions.push(options);
      return 'COMPLETED';
    },
  });

  assert.equal(await service.processOne(engine, 3, 4, {
    depth: 14,
    multipv: 1,
    force: true,
    refreshTagsAfterAnalysis: true,
  }), 'COMPLETED');
  assert.equal(analysisOptions.length, 1);
  assert.equal(analysisOptions[0].force, true);
  assert.equal(analysisOptions[0].refreshTagsAfterAnalysis, true);
}

{
  let openingCalls = 0;
  const controller = new AbortController();
  const service = createImportedGameProcessingService({
    indexOne: async (_userId, gameId) => {
      controller.abort(new Error('stop after indexing'));
      return { importedGameId: gameId, status: 'INDEXED' };
    },
    assignMissingOpening: async (_userId, gameId) => {
      openingCalls += 1;
      return { importedGameId: gameId, status: 'SKIPPED' };
    },
    analyseOne: async () => 'COMPLETED',
  });

  await assert.rejects(
    service.indexOne(1, 2, { force: false, signal: controller.signal }),
    /stop after indexing/,
  );
  assert.equal(openingCalls, 0);
}

{
  let openingCalls = 0;
  const service = createImportedGameProcessingService({
    indexOne: async (_userId, gameId) => ({
      importedGameId: gameId,
      status: 'FAILED',
      error: 'bad pgn',
    }),
    assignMissingOpening: async (_userId, gameId) => {
      openingCalls += 1;
      return { importedGameId: gameId, status: 'SKIPPED' };
    },
    analyseOne: async () => 'SKIPPED',
  });

  await assert.rejects(service.indexOne(1, 2, { force: false }), /bad pgn/);
  assert.equal(openingCalls, 0);
}

console.log('Imported-game processing orchestration tests passed.');
