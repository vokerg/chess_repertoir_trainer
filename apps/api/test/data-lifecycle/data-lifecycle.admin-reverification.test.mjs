import assert from 'node:assert/strict';
import { bindAdminReverificationUse } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';

const digest = (character) => character.repeat(64);
const binding = {
  operationId: 41,
  actorKeyVersion: 3,
  actorKeyHash: digest('a'),
  targetKeyVersion: 3,
  targetKeyHash: digest('b'),
  action: 'PURGE_ACCOUNT_DATA',
  previewHash: digest('c'),
  idempotencyKeyHash: digest('d'),
  verification: { reverificationIdHash: digest('e') },
};

let created = null;
await bindAdminReverificationUse(
  {
    $executeRaw: async () => 1,
    adminReverificationUse: {
      findUnique: async () => null,
      create: async ({ data }) => {
        created = data;
        return data;
      },
    },
  },
  binding,
);
assert.deepEqual(created, {
  reverificationIdHash: digest('e'),
  operationId: 41,
  actorKeyVersion: 3,
  actorKeyHash: digest('a'),
  targetKeyVersion: 3,
  targetKeyHash: digest('b'),
  action: 'PURGE_ACCOUNT_DATA',
  previewHash: digest('c'),
  idempotencyKeyHash: digest('d'),
});

await bindAdminReverificationUse(
  {
    $executeRaw: async () => 1,
    adminReverificationUse: {
      findUnique: async () => ({ id: 1, ...created, createdAt: new Date() }),
      create: async () => assert.fail('matching replay must not insert another use'),
    },
  },
  binding,
);

await assert.rejects(
  () =>
    bindAdminReverificationUse(
      {
        $executeRaw: async () => 1,
        adminReverificationUse: {
          findUnique: async () => ({
            id: 1,
            ...created,
            operationId: 99,
            createdAt: new Date(),
          }),
          create: async () => assert.fail('reused evidence must not be inserted'),
        },
      },
      binding,
    ),
  /already used/,
);

console.log('Administrator lifecycle reverification binding tests passed.');
