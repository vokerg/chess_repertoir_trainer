import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const now = new Date('2026-08-22T08:00:00.000Z');
let user = null;

try {
  user = await prisma.appUser.create({
    data: {
      displayName: 'Malformed expansion lineage test',
      authProvider: 'test',
      authSubject: `malformed-expansion-${suffix}`,
      onboardingDisposition: 'SKIPPED',
      onboardingDispositionReason: 'USER_SKIPPED',
      onboardingDispositionAt: now,
    },
  });
  const historicalOnboarding = await prisma.dataPreparationRun.create({
    data: {
      userId: user.id,
      purpose: 'ONBOARDING',
      status: 'FAILED',
      recipeVersion: 1,
      recipeJson: {},
      completedAt: now,
    },
  });
  const malformedExpansion = await prisma.dataPreparationRun.create({
    data: {
      userId: user.id,
      purpose: 'EXPANSION',
      status: 'RUNNING',
      recipeVersion: 1,
      recipeJson: {},
      retryOfRunId: historicalOnboarding.id,
    },
  });

  await prisma.dataPreparationRun.update({
    where: { id: malformedExpansion.id },
    data: { coreReadyAt: now },
  });

  const retainedDisposition = await prisma.appUser.findUniqueOrThrow({
    where: { id: user.id },
  });
  assert.equal(retainedDisposition.onboardingDisposition, 'SKIPPED');
  assert.equal(retainedDisposition.onboardingDispositionReason, 'USER_SKIPPED');

  console.log('Onboarding expansion disposition fence tests passed.');
} finally {
  if (user) await prisma.appUser.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}
