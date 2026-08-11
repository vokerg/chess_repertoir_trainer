import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import prismaModule from '../../dist/prisma.js';
import {
  AdminDiagnosticsRepository,
} from '../../dist/modules/admin/admin-diagnostics.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const subjectPrefix = `admin-query-shape-${suffix}`;

try {
  await prisma.appUser.createMany({
    data: Array.from({ length: 105 }, (_value, index) => ({
      authProvider: 'admin-test',
      authSubject: `${subjectPrefix}-${index}`,
      displayName: `Admin test ${index}`,
    })),
  });

  const users = await prisma.appUser.findMany({
    where: { authProvider: 'admin-test', authSubject: { startsWith: subjectPrefix } },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  assert.equal(users.length, 105);

  const account = await prisma.externalAccount.create({
    data: {
      userId: users[0].id,
      provider: 'lichess',
      username: `admin-query-${suffix}`,
      isActive: true,
    },
  });
  const secondAccount = await prisma.externalAccount.create({
    data: {
      userId: users[0].id,
      provider: 'chess.com',
      username: `admin-query-second-${suffix}`,
      isActive: true,
    },
  });
  const oldestQueuedStartedAt = new Date('2026-08-04T18:00:00.000Z');
  const newestQueuedStartedAt = new Date('2026-08-04T19:59:00.000Z');
  await prisma.importRun.createMany({
    data: [
      {
        userId: users[0].id,
        accountId: account.id,
        provider: account.provider,
        status: 'QUEUED',
        startedAt: oldestQueuedStartedAt,
      },
      {
        userId: users[0].id,
        accountId: secondAccount.id,
        provider: secondAccount.provider,
        status: 'QUEUED',
        startedAt: newestQueuedStartedAt,
      },
    ],
  });

  const first = await AdminDiagnosticsRepository.listUsers({ limit: 25 });
  const fixtureRows = first.rows.filter((row) => users.some((user) => user.id === row.id));
  assert.ok(fixtureRows.length > 0);
  for (let index = 1; index < first.rows.length; index += 1) {
    assert.ok(first.rows[index - 1].id > first.rows[index].id, 'user list must be id DESC');
  }
  assert.equal(first.rows[0].id, users[0].id);
  assert.equal(first.rows[0].accountCount, 2);
  assert.equal(first.rows[0].activeAccountCount, 2);
  assert.equal(first.rows[0].activeWorkCount, 2, 'active import runs contribute to active work');
  assert.equal(first.hasMore, true);

  const imports = await AdminDiagnosticsRepository.loadImports(users[0].id, 1);
  assert.equal(imports.rows.length, 1, 'the visible import list remains bounded');
  assert.equal(imports.rows[0].startedAt.toISOString(), newestQueuedStartedAt.toISOString());
  assert.equal(imports.queuedCount, 2);
  assert.equal(
    imports.oldestQueuedStartedAt?.toISOString(),
    oldestQueuedStartedAt.toISOString(),
    'oldest queued evidence must be independent of the bounded newest-first list',
  );

  const second = await AdminDiagnosticsRepository.listUsers({
    cursorId: first.rows.at(-1).id,
    limit: 25,
  });
  assert.ok(second.rows.every((row) => row.id < first.rows.at(-1).id));
  assert.ok(second.rows.length <= 25);

  const plan = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
    return tx.$queryRawUnsafe(
      'EXPLAIN (FORMAT JSON) SELECT "id" FROM "AppUser" WHERE "id" < $1 ORDER BY "id" DESC LIMIT 25',
      users[0].id + 1,
    );
  });
  const planText = JSON.stringify(plan);
  assert.match(planText, /Index Scan|Index Only Scan/);
  assert.match(planText, /AppUser_pkey/);

  const repositorySource = await readFile(
    new URL('../../src/modules/admin/admin-diagnostics.repository.prisma.ts', import.meta.url),
    'utf8',
  );
  assert.match(repositorySource, /take: input\.limit \+ 1/);
  assert.match(repositorySource, /userId: \{ in: userIds \}/);
  assert.match(repositorySource, /_min: \{ startedAt: true \}/);
  assert.doesNotMatch(
    repositorySource,
    /Promise\.all\(\s*page\.map/,
    'user summaries must not issue one query group per returned user',
  );

  console.log('Administrator diagnostics repository query-shape tests passed.');
} finally {
  await prisma.appUser.deleteMany({
    where: { authProvider: 'admin-test', authSubject: { startsWith: subjectPrefix } },
  });
  await prisma.$disconnect();
}
