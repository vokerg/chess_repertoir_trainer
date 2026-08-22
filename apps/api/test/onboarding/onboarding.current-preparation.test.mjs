import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { onboardingReadinessResponseSchema } from '@chess-trainer/contracts/onboarding';
import { createOnboardingReadRepository } from '../../dist/modules/onboarding/onboarding.repository.prisma.js';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const repository = createOnboardingReadRepository(prisma);
const suffix = randomUUID();
const now = new Date('2026-08-22T04:30:00.000Z');
const tacticalEvidenceRepository = {
  async get() {
    return { eligibleCount: 0, processedCount: 0, detectionCount: 0 };
  },
};
let onboardingUser = null;
let expansionUser = null;

try {
  onboardingUser = await prisma.appUser.create({
    data: {
      displayName: 'Onboarding recovery projection test',
      authProvider: 'test',
      authSubject: `onboarding-recovery-${suffix}`,
    },
  });
  const initialRun = await prisma.dataPreparationRun.create({
    data: {
      userId: onboardingUser.id,
      purpose: 'ONBOARDING',
      status: 'FAILED',
      recipeVersion: 1,
      recipeJson: {},
      completedAt: now,
    },
  });
  const recoveryRun = await prisma.dataPreparationRun.create({
    data: {
      userId: onboardingUser.id,
      purpose: 'RECOVERY',
      status: 'RUNNING',
      recipeVersion: 1,
      recipeJson: {},
      retryOfRunId: initialRun.id,
    },
  });

  const projectedRecovery = await repository.getLatestRun(onboardingUser.id);
  assert.equal(projectedRecovery?.id, recoveryRun.id);
  assert.equal(projectedRecovery?.purpose, 'RECOVERY');

  const recoveryResponse = onboardingReadinessResponseSchema.parse(
    await createOnboardingReadinessService({
      repository,
      tacticalEvidenceRepository,
      now: () => now,
    }).get(onboardingUser.id),
  );
  assert.equal(recoveryResponse.preparation?.runId, recoveryRun.id);
  assert.equal(recoveryResponse.preparation?.purpose, 'RECOVERY');
  assert.equal(recoveryResponse.presentationState, 'PREPARING');

  await prisma.dataPreparationRun.update({
    where: { id: recoveryRun.id },
    data: { coreReadyAt: now },
  });
  const completedUser = await prisma.appUser.findUniqueOrThrow({
    where: { id: onboardingUser.id },
  });
  assert.equal(completedUser.onboardingDisposition, 'COMPLETED');
  assert.equal(completedUser.onboardingDispositionReason, 'CORE_READY');

  await prisma.dataPreparationRun.update({
    where: { id: recoveryRun.id },
    data: { status: 'COMPLETED', completedAt: now },
  });
  const expansionRun = await prisma.dataPreparationRun.create({
    data: {
      userId: onboardingUser.id,
      purpose: 'EXPANSION',
      status: 'RUNNING',
      recipeVersion: 1,
      recipeJson: {},
    },
  });
  const expansionResponse = onboardingReadinessResponseSchema.parse(
    await createOnboardingReadinessService({
      repository,
      tacticalEvidenceRepository,
      now: () => now,
    }).get(onboardingUser.id),
  );
  assert.equal(expansionResponse.preparation?.runId, expansionRun.id);
  assert.equal(expansionResponse.preparation?.purpose, 'EXPANSION');

  expansionUser = await prisma.appUser.create({
    data: {
      displayName: 'Expansion recovery disposition test',
      authProvider: 'test',
      authSubject: `expansion-recovery-${suffix}`,
      onboardingDisposition: 'SKIPPED',
      onboardingDispositionReason: 'USER_SKIPPED',
      onboardingDispositionAt: now,
    },
  });
  const failedExpansion = await prisma.dataPreparationRun.create({
    data: {
      userId: expansionUser.id,
      purpose: 'EXPANSION',
      status: 'FAILED',
      recipeVersion: 1,
      recipeJson: {},
      completedAt: now,
    },
  });
  const expansionRecovery = await prisma.dataPreparationRun.create({
    data: {
      userId: expansionUser.id,
      purpose: 'RECOVERY',
      status: 'RUNNING',
      recipeVersion: 1,
      recipeJson: {},
      retryOfRunId: failedExpansion.id,
    },
  });
  await prisma.dataPreparationRun.update({
    where: { id: expansionRecovery.id },
    data: { coreReadyAt: now },
  });
  const stillSkipped = await prisma.appUser.findUniqueOrThrow({
    where: { id: expansionUser.id },
  });
  assert.equal(stillSkipped.onboardingDisposition, 'SKIPPED');
  assert.equal(stillSkipped.onboardingDispositionReason, 'USER_SKIPPED');

  console.log('Onboarding current preparation and recovery lineage tests passed.');
} finally {
  if (onboardingUser) await prisma.appUser.delete({ where: { id: onboardingUser.id } });
  if (expansionUser) await prisma.appUser.delete({ where: { id: expansionUser.id } });
  await prisma.$disconnect();
}
