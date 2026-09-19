import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  runPositionCleanupCommand,
  runPositionCleanupEntrypoint,
} from '../../dist/scripts/cleanup-orphan-positions.js';
import {
  loadPositionCleanupConfig,
} from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import {
  POSITION_CLEANUP_EXECUTE_CONFIRMATION,
} from '../../dist/modules/position-cleanup/position-cleanup.service.js';

const commandSource = await readFile(
  new URL('../../src/scripts/cleanup-orphan-positions.ts', import.meta.url),
  'utf8',
);
assert.match(commandSource, /createPositionCleanupService/);
assert.match(commandSource, /createPositionCleanupWorker/);
assert.match(commandSource, /runPositionCleanupCommand/);
assert.doesNotMatch(
  commandSource,
  /\$(?:execute|query)Raw|\bDELETE\s+FROM\b|\bLOCK\s+TABLE\b/i,
  'manual command must not contain a parallel cleanup SQL/state-machine implementation',
);

const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '500',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '100',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});

function createRun(mode, status, phase, terminalResult = null) {
  return {
    id: 412,
    mode,
    status,
    phase,
    policyVersion: 'ONB-026-v1',
    graceDays: 30,
    graceCutoff: new Date('2026-08-12T00:00:00.000Z'),
    inputPageSize: 500,
    initialDeleteBatchSize: 100,
    deleteBatchSize: 100,
    lockTimeoutMs: 250,
    requestedBy: 'server-command:position-cleanup',
    reconcileUpperBound: 0,
    positionUpperBound: 0,
    evaluationUpperBound: 0,
    reconcileAfterPositionId: 0,
    observeAfterPositionId: 0,
    evaluateAfterPositionId: 0,
    reconcileCandidatesInspected: 0,
    candidatesReconciled: 0,
    positionsInspected: 0,
    orphansMatched: 0,
    orphansFirstObserved: 0,
    orphansRefreshed: 0,
    candidatesInspected: 0,
    candidatesMatched: 0,
    eligibleObserved: 0,
    positionsDeleted: 0,
    analysisRowsDeleted: 0,
    cacheRowsDeleted: 0,
    skippedReferenced: 0,
    retryCount: 0,
    lockTimeoutStreak: 0,
    staleRecoveryCount: 0,
    workKey: null,
    claimedAt: null,
    heartbeatAt: null,
    cancelRequestedAt: null,
    observationStartedAt: null,
    observationCompletedAt: null,
    lastBatchAt: null,
    terminalResult,
    errorCode: null,
    startedAt: null,
    completedAt: status === 'COMPLETED' ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createFakeCommand(mode, terminalStatus = 'COMPLETED', terminalResult) {
  const events = { previewModes: [], creates: [], statusCalls: 0, workCalls: 0 };
  const queued = createRun(mode, 'QUEUED', 'RECONCILE');
  const terminal = createRun(
    mode,
    terminalStatus,
    'DONE',
    terminalResult ?? (terminalStatus === 'COMPLETED' ? (mode === 'DRY_RUN' ? 'OBSERVATIONAL' : 'EXECUTED') : 'FAILED'),
  );
  let currentStatus = queued;
  const service = {
    async preview(requestedMode) {
      events.previewModes.push(requestedMode);
      return {
        mode: requestedMode,
        policyVersion: 'ONB-026-v1',
        graceDays: 30,
        graceCutoff: new Date('2026-08-12T00:00:00.000Z'),
        inputPageSize: 500,
        deleteBatchSize: 100,
        lockTimeoutMs: 250,
        observational: requestedMode === 'DRY_RUN',
        postgresServerVersionNum: 170011,
      };
    },
    async create(input) {
      events.creates.push(input);
      return queued;
    },
    async status() {
      events.statusCalls += 1;
      const result = currentStatus;
      currentStatus = terminal;
      return result;
    },
  };
  const worker = {
    async runOnce() {
      events.workCalls += 1;
      return true;
    },
    requestStop() {},
    async run() {},
  };
  return { events, service, worker };
}

const dryRun = createFakeCommand('DRY_RUN');
const dryRunLogs = [];
assert.equal(
  await runPositionCleanupCommand({
    apply: false,
    config,
    service: dryRun.service,
    worker: dryRun.worker,
    log: (message) => dryRunLogs.push(message),
  }),
  true,
);
assert.deepEqual(dryRun.events.previewModes, ['DRY_RUN']);
assert.deepEqual(dryRun.events.creates, [{
  mode: 'DRY_RUN',
  requestedBy: 'server-command:position-cleanup',
  confirmation: undefined,
}]);
assert.equal(dryRun.events.workCalls, 1);
assert.match(dryRunLogs.join('\n'), /"observational":true/);
assert.match(dryRunLogs.join('\n'), /Dry-run is observational across bounded transactions/);
assert.match(dryRunLogs.join('\n'), /"terminalResult":"OBSERVATIONAL"/);

const execute = createFakeCommand('EXECUTE');
const executeLogs = [];
assert.equal(
  await runPositionCleanupCommand({
    apply: true,
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
    config,
    service: execute.service,
    worker: execute.worker,
    log: (message) => executeLogs.push(message),
  }),
  true,
);
assert.deepEqual(execute.events.previewModes, ['EXECUTE']);
assert.deepEqual(execute.events.creates, [{
  mode: 'EXECUTE',
  requestedBy: 'server-command:position-cleanup',
  confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
}]);
assert.match(executeLogs.join('\n'), /"observational":false/);
assert.match(executeLogs.join('\n'), /"terminalResult":"EXECUTED"/);

const invalidExecute = createFakeCommand('EXECUTE');
await assert.rejects(
  () => runPositionCleanupCommand({
    apply: true,
    config,
    service: invalidExecute.service,
    worker: invalidExecute.worker,
    log() {},
  }),
  /Execution requires --apply --confirm=DELETE_ORPHAN_POSITIONS/,
);
assert.equal(invalidExecute.events.previewModes.length, 0);
assert.equal(invalidExecute.events.creates.length, 0);

const failed = createFakeCommand('EXECUTE', 'NEEDS_ATTENTION', 'NEEDS_ATTENTION');
assert.equal(
  await runPositionCleanupCommand({
    apply: true,
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
    config,
    service: failed.service,
    worker: failed.worker,
    log() {},
  }),
  false,
);

const entryDryRun = createFakeCommand('DRY_RUN');
let entryDryRunExitCode;
assert.equal(
  await runPositionCleanupEntrypoint({
    argv: [],
    config,
    service: entryDryRun.service,
    worker: entryDryRun.worker,
    log() {},
    setExitCode: (value) => { entryDryRunExitCode = value; },
  }),
  true,
);
assert.equal(entryDryRunExitCode, undefined);
assert.deepEqual(entryDryRun.events.previewModes, ['DRY_RUN']);

const entryExecuteFailure = createFakeCommand('EXECUTE', 'NEEDS_ATTENTION', 'NEEDS_ATTENTION');
let entryExecuteExitCode;
assert.equal(
  await runPositionCleanupEntrypoint({
    argv: ['--apply', `--confirm=${POSITION_CLEANUP_EXECUTE_CONFIRMATION}`],
    config,
    service: entryExecuteFailure.service,
    worker: entryExecuteFailure.worker,
    log() {},
    setExitCode: (value) => { entryExecuteExitCode = value; },
  }),
  false,
);
assert.equal(entryExecuteExitCode, 1);
assert.deepEqual(entryExecuteFailure.events.creates, [{
  mode: 'EXECUTE',
  requestedBy: 'server-command:position-cleanup',
  confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
}]);

const entryInvalidExecute = createFakeCommand('EXECUTE');
let entryInvalidExitCode;
await assert.rejects(
  runPositionCleanupEntrypoint({
    argv: ['--apply'],
    config,
    service: entryInvalidExecute.service,
    worker: entryInvalidExecute.worker,
    log() {},
    setExitCode: (value) => { entryInvalidExitCode = value; },
  }),
  /Execution requires --apply --confirm=DELETE_ORPHAN_POSITIONS/,
);
assert.equal(entryInvalidExitCode, 1);
assert.equal(entryInvalidExecute.events.previewModes.length, 0);

console.log('Position cleanup command tests passed.');
