import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  createOnboardingCommandService,
  OnboardingCommandAccountNotFoundError,
  OnboardingCommandActiveRunError,
  OnboardingCommandInvalidStateError,
} from '../../dist/modules/onboarding/onboarding-command.service.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const now = new Date('2026-08-31T12:00:00.000Z');
const users = [];

async function createUser(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: label,
      authProvider: 'test',
      authSubject: `${label.toLowerCase().replaceAll(' ', '-')}-${suffix}`,
    },
  });
  users.push(user);
  return user;
}

async function createAccount(userId, provider, label) {
  return prisma.externalAccount.create({
    data: {
      userId,
      provider,
      username: `${label}-${suffix}`,
    },
  });
}

async function terminalizeRun(runId) {
  const run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: runId },
    include: { targets: true },
  });
  for (const target of run.targets) {
    if (target.currentImportRunId !== null) {
      await prisma.importRun.update({
        where: { id: target.currentImportRunId },
        data: { status: 'COMPLETED', completedAt: now },
      });
    }
  }
  await prisma.dataPreparationRun.update({
    where: { id: runId },
    data: { status: 'COMPLETED', completedAt: now, analysisCompletedAt: now, reconcileAfter: null },
  });
}

try {
  const service = createOnboardingCommandService({ now: () => now });

  // Non-equivalent concurrent starts must not leave a losing import accepted without a preparation target.
  const raceUser = await createUser('Onboarding admission race');
  const raceAccountA = await createAccount(raceUser.id, 'lichess', 'race-a');
  const raceAccountB = await createAccount(raceUser.id, 'chess.com', 'race-b');
  const raced = await Promise.allSettled([
    service.start(raceUser.id, raceAccountA.id),
    service.start(raceUser.id, raceAccountB.id),
  ]);
  const fulfilled = raced.filter((result) => result.status === 'fulfilled');
  const rejected = raced.filter((result) => result.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason instanceof OnboardingCommandActiveRunError, true);

  const raceRuns = await prisma.dataPreparationRun.findMany({
    where: { userId: raceUser.id },
    include: { targets: true },
  });
  const raceImports = await prisma.importRun.findMany({
    where: { userId: raceUser.id, source: 'ONBOARDING' },
  });
  assert.equal(raceRuns.length, 1);
  assert.equal(raceImports.length, 1);
  assert.equal(raceRuns[0].targets.length, 1);
  assert.equal(raceRuns[0].targets[0].currentImportRunId, raceImports[0].id);
  assert.equal(raceRuns[0].targets[0].accountId, raceImports[0].accountId);

  // Completed users cannot bypass the expansion/recovery state machine with a fresh first-run command.
  const completedUser = await createUser('Onboarding completed start gate');
  const completedAccount = await createAccount(completedUser.id, 'lichess', 'completed-gate');
  await prisma.appUser.update({
    where: { id: completedUser.id },
    data: {
      onboardingDisposition: 'COMPLETED',
      onboardingDispositionReason: 'CORE_READY',
      onboardingDispositionAt: now,
    },
  });
  await assert.rejects(
    () => service.start(completedUser.id, completedAccount.id),
    (error) => error instanceof OnboardingCommandInvalidStateError,
  );
  assert.equal(await prisma.dataPreparationRun.count({ where: { userId: completedUser.id } }), 0);
  assert.equal(await prisma.importRun.count({ where: { userId: completedUser.id, source: 'ONBOARDING' } }), 0);

  // A terminal failed/cancelled first run must preserve recovery lineage instead of accepting another ONBOARDING run.
  const recoveryUser = await createUser('Onboarding recovery gate');
  const recoveryAccount = await createAccount(recoveryUser.id, 'chess.com', 'recovery-gate');
  const initial = await service.start(recoveryUser.id, recoveryAccount.id);
  const initialRun = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: initial.runId },
    include: { targets: true },
  });
  const initialImportId = initialRun.targets[0].currentImportRunId;
  await prisma.importRun.update({
    where: { id: initialImportId },
    data: { status: 'CANCELLED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: initial.runId },
    data: { status: 'CANCELLED', completedAt: now, reconcileAfter: null },
  });
  await assert.rejects(
    () => service.start(recoveryUser.id, recoveryAccount.id),
    (error) => error instanceof OnboardingCommandInvalidStateError,
  );
  assert.equal(await prisma.dataPreparationRun.count({ where: { userId: recoveryUser.id, purpose: 'ONBOARDING' } }), 1);

  const recovery = await service.restart(recoveryUser.id, initial.runId);
  await terminalizeRun(recovery.runId);
  const replayedRecovery = await service.restart(recoveryUser.id, initial.runId);
  assert.equal(replayedRecovery.runId, recovery.runId);
  assert.equal(replayedRecovery.idempotent, true);
  assert.equal(await prisma.dataPreparationRun.count({
    where: { userId: recoveryUser.id, purpose: 'RECOVERY', retryOfRunId: initial.runId },
  }), 1);

  // Replacing NO_RECENT_GAMES is atomic: failed replacement admission leaves the source untouched.
  const expansionUser = await createUser('Onboarding expansion rollback');
  const expansionAccount = await createAccount(expansionUser.id, 'lichess', 'expansion-source');
  const foreignUser = await createUser('Onboarding expansion foreign owner');
  const foreignAccount = await createAccount(foreignUser.id, 'chess.com', 'foreign-account');
  const expansionStart = await service.start(expansionUser.id, expansionAccount.id);
  const source = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: expansionStart.runId },
    include: { targets: true },
  });
  await prisma.importRun.update({
    where: { id: source.targets[0].currentImportRunId },
    data: { status: 'COMPLETED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: source.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No eligible recent games.',
      reconcileAfter: null,
    },
  });

  await assert.rejects(
    () => service.expand(expansionUser.id, source.id, {
      kind: 'ADD_ACCOUNT',
      accountId: foreignAccount.id,
    }),
    (error) => error instanceof OnboardingCommandAccountNotFoundError,
  );
  const preservedSource = await prisma.dataPreparationRun.findUniqueOrThrow({ where: { id: source.id } });
  assert.equal(preservedSource.status, 'NEEDS_ATTENTION');
  assert.equal(preservedSource.attentionCode, 'NO_RECENT_GAMES');
  assert.equal(preservedSource.completedAt, null);
  assert.equal(preservedSource.analysisCompletedAt, null);
  assert.equal(await prisma.dataPreparationRun.count({
    where: { userId: expansionUser.id, purpose: 'EXPANSION' },
  }), 0);

  // Successful replacement retires only the source run; it does not invent an analysis-complete milestone.
  const addedAccount = await createAccount(expansionUser.id, 'chess.com', 'owned-expansion');
  const expansion = await service.expand(expansionUser.id, source.id, {
    kind: 'ADD_ACCOUNT',
    accountId: addedAccount.id,
  });
  const retiredSource = await prisma.dataPreparationRun.findUniqueOrThrow({ where: { id: source.id } });
  assert.equal(retiredSource.status, 'COMPLETED');
  assert.equal(retiredSource.attentionCode, null);
  assert.ok(retiredSource.completedAt);
  assert.equal(retiredSource.analysisCompletedAt, null);

  await terminalizeRun(expansion.runId);
  const replayedExpansion = await service.expand(expansionUser.id, source.id, {
    kind: 'ADD_ACCOUNT',
    accountId: addedAccount.id,
  });
  assert.equal(replayedExpansion.runId, expansion.runId);
  assert.equal(replayedExpansion.idempotent, true);
  assert.equal(await prisma.dataPreparationRun.count({
    where: { userId: expansionUser.id, purpose: 'EXPANSION' },
  }), 1);

  console.log('Onboarding lifecycle command admission tests passed.');
} finally {
  for (const user of users.reverse()) {
    await prisma.appUser.delete({ where: { id: user.id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
}