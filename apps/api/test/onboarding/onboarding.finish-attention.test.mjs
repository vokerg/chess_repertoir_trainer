import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createOnboardingCommandService } from '../../dist/modules/onboarding/onboarding-command.service.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const changedAt = new Date('2026-08-26T06:00:00.000Z');
const users = [];
const service = createOnboardingCommandService({ now: () => changedAt });

async function verifyFinish(attentionCode, expectedReason) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Finish ${attentionCode}`,
      authProvider: 'test',
      authSubject: `finish-${attentionCode.toLowerCase()}-${suffix}`,
    },
  });
  users.push(user);

  const run = await prisma.dataPreparationRun.create({
    data: {
      userId: user.id,
      purpose: 'ONBOARDING',
      status: 'NEEDS_ATTENTION',
      recipeVersion: 1,
      recipeJson: {},
      attentionCode,
      attentionDetail: `Attention: ${attentionCode}`,
    },
  });

  const result = await service.finish(user.id, run.id);
  assert.equal(result.disposition, 'COMPLETED');
  assert.equal(result.reason, expectedReason);
  assert.equal(result.idempotent, false);

  const repeated = await service.finish(user.id, run.id);
  assert.equal(repeated.disposition, 'COMPLETED');
  assert.equal(repeated.reason, expectedReason);
  assert.equal(repeated.idempotent, true);

  const persistedRun = await prisma.dataPreparationRun.findUniqueOrThrow({ where: { id: run.id } });
  assert.equal(persistedRun.status, 'NEEDS_ATTENTION');
  assert.equal(persistedRun.attentionCode, attentionCode);
}

try {
  await verifyFinish('ALL_INDEXING_FAILED', 'USER_FINISHED_ALL_INDEXING_FAILED');
  await verifyFinish('IMPORT_RETRY_AVAILABLE', 'USER_FINISHED_IMPORT_RETRY_AVAILABLE');
  console.log('Onboarding advertised finish outcome tests passed.');
} finally {
  for (const user of users.reverse()) {
    await prisma.appUser.delete({ where: { id: user.id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
}
