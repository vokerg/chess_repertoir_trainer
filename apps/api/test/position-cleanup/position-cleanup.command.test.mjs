import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const script = 'dist/scripts/cleanup-orphan-positions.js';
const commandEnv = {
  ...process.env,
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_GRACE_DAYS: '30',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '500',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '100',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
};

function runCommand(args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env: commandEnv,
    encoding: 'utf8',
    timeout: 30_000,
  });
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const dryRun = runCommand();
  assert.equal(dryRun.error, undefined);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /"mode":"DRY_RUN"/);
  assert.match(dryRun.stdout, /"observational":true/);
  assert.match(dryRun.stdout, /"runId":\d+/);
  assert.match(dryRun.stdout, /"terminalResult":"OBSERVATIONAL"/);
  assert.match(dryRun.stdout, /Dry-run is observational across bounded transactions/);

  const dryRunRows = await prisma.$queryRaw`
    SELECT "status", "terminalResult", "positionsDeleted"
    FROM "PositionCleanupRun"
    ORDER BY "id" DESC
    LIMIT 1
  `;
  assert.equal(dryRunRows[0]?.status, 'COMPLETED');
  assert.equal(dryRunRows[0]?.terminalResult, 'OBSERVATIONAL');
  assert.equal(dryRunRows[0]?.positionsDeleted, 0);

  const missingConfirmation = runCommand(['--apply']);
  assert.equal(missingConfirmation.error, undefined);
  assert.notEqual(missingConfirmation.status, 0);
  assert.match(missingConfirmation.stderr, /Execution requires --apply --confirm=DELETE_ORPHAN_POSITIONS/);

  // Clear observation state immediately before execute. The confirmed command will
  // observe candidates at the current time, so the 30-day policy makes deletion zero.
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;
  const positionCountBefore = await prisma.position.count();

  const execute = runCommand(['--apply', '--confirm=DELETE_ORPHAN_POSITIONS']);
  assert.equal(execute.error, undefined);
  assert.equal(execute.status, 0, execute.stderr);
  assert.match(execute.stdout, /"mode":"EXECUTE"/);
  assert.match(execute.stdout, /"observational":false/);
  assert.match(execute.stdout, /"terminalResult":"EXECUTED"/);
  assert.match(execute.stdout, /"positionsDeleted":0/);
  assert.equal(await prisma.position.count(), positionCountBefore);

  const executeRows = await prisma.$queryRaw`
    SELECT "status", "terminalResult", "positionsDeleted", "requestedBy"
    FROM "PositionCleanupRun"
    ORDER BY "id" DESC
    LIMIT 1
  `;
  assert.equal(executeRows[0]?.status, 'COMPLETED');
  assert.equal(executeRows[0]?.terminalResult, 'EXECUTED');
  assert.equal(executeRows[0]?.positionsDeleted, 0);
  assert.equal(executeRows[0]?.requestedBy, 'server-command:position-cleanup');

  console.log('Position cleanup command tests passed.');
} finally {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
}
