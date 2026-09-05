import assert from 'node:assert/strict';
import {
  POSITION_CLEANUP_DEFAULT_GRACE_DAYS,
  POSITION_CLEANUP_MAX_INPUT_PAGE_SIZE,
  loadPositionCleanupConfig,
} from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import {
  POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  createPositionCleanupService,
} from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { POSITION_CLEANUP_TABLE_LOCK_ORDER } from '../../dist/modules/position-cleanup/position-cleanup.types.js';

const defaults = loadPositionCleanupConfig({});
assert.equal(defaults.enabled, false);
assert.equal(defaults.graceDays, POSITION_CLEANUP_DEFAULT_GRACE_DAYS);
assert.equal(defaults.inputPageSize, POSITION_CLEANUP_MAX_INPUT_PAGE_SIZE);
assert.equal(defaults.deleteBatchSize <= defaults.inputPageSize, true);
assert.deepEqual(POSITION_CLEANUP_TABLE_LOCK_ORDER, [
  'ImportedGamePly',
  'ImportedGamePosition',
  'PositionAnalysis',
  'MastersExplorerCache',
]);

assert.throws(
  () => loadPositionCleanupConfig({ POSITION_CLEANUP_INPUT_PAGE_SIZE: '501' }),
  /must not exceed 500/,
);
assert.throws(
  () => loadPositionCleanupConfig({ POSITION_CLEANUP_GRACE_DAYS: '29' }),
  /must be at least 30/,
);
assert.throws(
  () => loadPositionCleanupConfig({
    POSITION_CLEANUP_INPUT_PAGE_SIZE: '50',
    POSITION_CLEANUP_DELETE_BATCH_SIZE: '51',
  }),
  /must not exceed POSITION_CLEANUP_INPUT_PAGE_SIZE/,
);

const config = loadPositionCleanupConfig({ POSITION_CLEANUP_ENABLED: 'true' });
let createdInput;
const repository = {
  assertDatabaseCapability: async () => 160000,
  createRun: async (input) => {
    createdInput = input;
    return { id: 42, mode: input.mode, status: 'QUEUED', phase: 'RECONCILE' };
  },
  getRun: async () => null,
  requestCancel: async () => { throw new Error('unused'); },
};
const service = createPositionCleanupService({
  config,
  repository,
  now: () => Date.parse('2026-09-03T06:00:00.000Z'),
});

const preview = await service.preview();
assert.equal(preview.mode, 'DRY_RUN');
assert.equal(preview.observational, true);
assert.equal(preview.postgresServerVersionNum, 160000);
assert.equal(preview.graceCutoff.toISOString(), '2026-08-04T06:00:00.000Z');

await assert.rejects(
  service.create({ mode: 'EXECUTE', requestedBy: 'test' }),
  /requires confirmation/,
);

const created = await service.create({
  mode: 'EXECUTE',
  requestedBy: 'test',
  confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
});
assert.equal(created.id, 42);
assert.equal(createdInput.mode, 'EXECUTE');
assert.equal(createdInput.graceDays, 30);

const disabledService = createPositionCleanupService({
  config: loadPositionCleanupConfig({}),
  repository,
});
await assert.rejects(disabledService.preview(), /Position cleanup is disabled/);
