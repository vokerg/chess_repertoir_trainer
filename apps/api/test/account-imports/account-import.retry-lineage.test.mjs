import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  AccountImportInvalidRetryError,
  createAccountImportRepository,
} from '../../dist/modules/account-imports/account-import.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createAccountImportRepository(prisma);
const suffix = randomUUID();
let userId;

const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-012 retry lineage',
      authProvider: 'test',
      authSubject: `onb-012-retry-lineage-${suffix}`,
    },
  });
  userId = user.id;

  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-012-retry-lineage-${suffix}`,
    },
  });

  const source = await repository.createRun({
    userId: user.id,
    accountId: account.id,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope,
    requestedFrom,
    requestedTo,
    priority: 100,
    windowsTotal: 3,
  });

  await prisma.importRun.update({
    where: { id: source.id },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorCode: 'TEST_FAILURE',
    },
  });

  await assert.rejects(
    repository.createRun({
      userId: user.id,
      accountId: account.id,
      mode: 'HISTORICAL_BACKFILL',
      source: 'USER_ACTION',
      scope,
      requestedFrom,
      requestedTo,
      priority: 100,
      windowsTotal: 3,
      retryOfImportRunId: source.id,
    }),
    (error) => error instanceof AccountImportInvalidRetryError
      && /mode/.test(error.message),
    'linked retries cannot silently change the source import mode',
  );
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
