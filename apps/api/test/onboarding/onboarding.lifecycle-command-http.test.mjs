import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import { createOnboardingCommandService } from '../../dist/modules/onboarding/onboarding-command.service.js';
import { createOnboardingCommandAdmissionRepository } from '../../dist/modules/onboarding/onboarding-command-admission.repository.prisma.js';
import { createOnboardingCommandRepository } from '../../dist/modules/onboarding/onboarding-command.repository.prisma.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const now = new Date('2026-08-31T12:00:00.000Z');
let user = null;
let createdDevUser = false;
let originalDisposition = null;
let otherUser = null;
let app = null;
let accountId = null;
let preparationId = null;
// Keep command transactions on an independent pool because the full integration
// runner loads many Prisma-backed fixtures into one Node process.
const commandPrisma = new PrismaClient();

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
  });
  if (existingDevUser) {
    user = existingDevUser;
    originalDisposition = {
      onboardingDisposition: existingDevUser.onboardingDisposition,
      onboardingDispositionReason: existingDevUser.onboardingDispositionReason,
      onboardingDispositionAt: existingDevUser.onboardingDispositionAt,
    };
    user = await prisma.appUser.update({
      where: { id: user.id },
      data: {
        onboardingDisposition: 'PENDING',
        onboardingDispositionReason: null,
        onboardingDispositionAt: null,
      },
    });
  } else {
    user = await prisma.appUser.create({
      data: {
        displayName: 'Local user',
        authProvider: 'dev',
        authSubject: 'dev-single-user',
      },
    });
    createdDevUser = true;
  }
  otherUser = await prisma.appUser.create({
    data: {
      displayName: 'Onboarding lifecycle HTTP other',
      authProvider: 'test',
      authSubject: `onboarding-lifecycle-http-other-${suffix}`,
    },
  });
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'lichess',
      username: `onboarding-lifecycle-http-${suffix}`,
    },
  });
  accountId = account.id;
  const service = createOnboardingCommandService({
    now: () => now,
    repository: createOnboardingCommandRepository(commandPrisma),
    admissionRepository: createOnboardingCommandAdmissionRepository(commandPrisma),
  });
  const start = await service.start(user.id, account.id);
  preparationId = start.runId;
  const run = await prisma.dataPreparationRun.findUniqueOrThrow({
    where: { id: start.runId },
    include: { targets: true },
  });
  const importRunId = run.targets[0].currentImportRunId;
  assert.ok(importRunId);

  const foreignRun = await prisma.dataPreparationRun.create({
    data: {
      userId: otherUser.id,
      purpose: 'ONBOARDING',
      status: 'NEEDS_ATTENTION',
      recipeVersion: 1,
      recipeJson: {},
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'foreign attention',
    },
  });

  app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: user.id },
    prisma: { $disconnect: async () => {} },
  });
  await app.ready();

  // A readiness-advertised import pause resumes the linked durable import.
  await prisma.importRun.update({
    where: { id: importRunId },
    data: { status: 'PAUSED', pauseRequestedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: run.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'IMPORT_PAUSED',
      attentionDetail: 'Linked import is paused.',
      reconcileAfter: null,
    },
  });
  const resumeResponse = await app.inject({
    method: 'POST',
    url: `/api/me/onboarding/runs/${run.id}/resume`,
  });
  assert.equal(resumeResponse.statusCode, 200, resumeResponse.body);
  assert.equal(resumeResponse.json().runId, run.id);
  assert.equal(
    (await prisma.importRun.findUniqueOrThrow({ where: { id: importRunId } })).status,
    'QUEUED',
  );

  // A readiness-advertised import retry returns 202, creates immutable lineage,
  // and relinks the same preparation target.
  await prisma.importRun.update({
    where: { id: importRunId },
    data: {
      status: 'FAILED',
      completedAt: now,
      errorCode: 'HTTP_TEST_FAILED',
      error: 'http test failure',
    },
  });
  await prisma.dataPreparationRun.update({
    where: { id: run.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'IMPORT_RETRY_AVAILABLE',
      attentionDetail: 'Linked import failed.',
      reconcileAfter: null,
    },
  });
  const retryResponse = await app.inject({
    method: 'POST',
    url: `/api/me/onboarding/runs/${run.id}/retry`,
  });
  assert.equal(retryResponse.statusCode, 202, retryResponse.body);
  assert.equal(retryResponse.json().runId, run.id);
  assert.equal(retryResponse.json().retryGeneration, 1);
  const retryTarget = await prisma.dataPreparationTarget.findFirstOrThrow({
    where: { preparationRunId: run.id },
  });
  assert.notEqual(retryTarget.currentImportRunId, importRunId);
  const retriedImport = await prisma.importRun.findUniqueOrThrow({
    where: { id: retryTarget.currentImportRunId },
  });
  assert.equal(retriedImport.retryOfImportRunId, importRunId);

  // Expected lifecycle conflicts are translated to the documented 409 contract,
  // rather than escaping as internal errors.
  await prisma.importRun.update({
    where: { id: retriedImport.id },
    data: { status: 'COMPLETED', completedAt: now },
  });
  await prisma.dataPreparationRun.update({
    where: { id: run.id },
    data: {
      status: 'NEEDS_ATTENTION',
      attentionCode: 'ALL_INDEXING_FAILED',
      attentionDetail: 'No failed index evidence exists in this fixture.',
      reconcileAfter: null,
    },
  });
  const invalidRetryResponse = await app.inject({
    method: 'POST',
    url: `/api/me/onboarding/runs/${run.id}/retry`,
  });
  assert.equal(invalidRetryResponse.statusCode, 409, invalidRetryResponse.body);
  assert.equal(invalidRetryResponse.json().code, 'ONBOARDING_INVALID_STATE');

  // Run identity is ownership-scoped through the HTTP surface, including finish.
  const foreignFinishResponse = await app.inject({
    method: 'POST',
    url: `/api/me/onboarding/runs/${foreignRun.id}/finish`,
  });
  assert.equal(foreignFinishResponse.statusCode, 404, foreignFinishResponse.body);
  assert.equal(foreignFinishResponse.json().code, 'ONBOARDING_NOT_FOUND');

  await prisma.appUser.update({
    where: { id: user.id },
    data: {
      onboardingDisposition: 'COMPLETED',
      onboardingDispositionReason: 'HTTP_TEST_COMPLETED',
      onboardingDispositionAt: now,
    },
  });
  const completedSkipResponse = await app.inject({
    method: 'POST',
    url: '/api/me/onboarding/skip',
  });
  assert.equal(completedSkipResponse.statusCode, 409, completedSkipResponse.body);
  assert.equal(completedSkipResponse.json().code, 'ONBOARDING_INVALID_STATE');

  console.log('Onboarding lifecycle command HTTP tests passed.');
} finally {
  if (app) await app.close().catch(() => undefined);
  if (otherUser) await prisma.appUser.delete({ where: { id: otherUser.id } }).catch(() => undefined);
  if (preparationId) {
    await prisma.dataPreparationRun.delete({ where: { id: preparationId } }).catch(() => undefined);
  }
  if (accountId) {
    await prisma.externalAccount.delete({ where: { id: accountId } }).catch(() => undefined);
  }
  if (user) {
    if (createdDevUser) {
      await prisma.appUser.delete({ where: { id: user.id } }).catch(() => undefined);
    } else if (originalDisposition) {
      await prisma.appUser.update({
        where: { id: user.id },
        data: originalDisposition,
      }).catch(() => undefined);
    }
  }
  await commandPrisma.$disconnect();
  await prisma.$disconnect();
}
