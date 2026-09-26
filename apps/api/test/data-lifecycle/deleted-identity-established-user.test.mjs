import assert from 'node:assert/strict';
import {
  createDeletedIdentityGuard,
  DeletedIdentityBlockedError,
} from '../../dist/modules/data-lifecycle/deleted-identity.guard.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const beforeDeletion = new Date('2026-05-01T00:00:00Z');
const deletionDate = new Date('2026-09-01T00:00:00Z');

function fixture({ existing = { id: 1, createdAt: beforeDeletion }, deleted = [], knownTombstone = null } = {}) {
  const calls = [];
  const transaction = {
    $executeRaw: async () => { calls.push('identity-lock'); },
    $queryRaw: async () => { calls.push('targeted-tombstone'); return deleted; },
    appUser: {
      findUnique: async () => { calls.push('existing-user'); return existing; },
    },
    deletedAuthIdentityTombstone: {
      findMany: async () => [{ identityKeyVersion: 1 }],
      findFirst: async (query) => query.where.OR
        ? knownTombstone
        : { createdAt: deletionDate },
    },
  };
  const database = { $transaction: async (callback) => callback(transaction) };
  return { calls, transaction, database };
}

const missingKeys = new LifecycleHmacKeyring([]);

{
  const { calls, transaction, database } = fixture();
  await createDeletedIdentityGuard(database, missingKeys).assertCanProvision(transaction, 'clerk', 'active-user');
  assert.deepEqual(calls, ['identity-lock', 'existing-user', 'targeted-tombstone']);
}

for (const existing of [null, { id: 1, createdAt: deletionDate }, { id: 1, createdAt: new Date('2026-10-01') }]) {
  const { transaction, database } = fixture({ existing });
  await assert.rejects(
    createDeletedIdentityGuard(database, missingKeys).assertCanProvision(transaction, 'clerk', 'new-or-recreated-user'),
    /unconfigured HMAC key version\(s\): 1/,
  );
}

{
  const { transaction, database } = fixture({ deleted: [{ operationId: 42 }] });
  await assert.rejects(
    createDeletedIdentityGuard(database, missingKeys).assertCanProvision(transaction, 'clerk', 'deleted-user'),
    (error) => error instanceof DeletedIdentityBlockedError && error.operationId === 42,
  );
}

{
  const { calls, transaction, database } = fixture({ knownTombstone: { operationId: 43 } });
  const partiallyConfigured = new LifecycleHmacKeyring([{ version: 2, secret: 'test-current-key' }]);
  await assert.rejects(
    createDeletedIdentityGuard(database, partiallyConfigured).assertCanProvision(transaction, 'clerk', 'known-deleted-user'),
    (error) => error instanceof DeletedIdentityBlockedError && error.operationId === 43,
  );
  assert.deepEqual(calls, ['identity-lock']);
}

{
  const { database } = fixture();
  await assert.rejects(
    createDeletedIdentityGuard(database, missingKeys).findOperationForIdentity('clerk', 'active-user'),
    /unconfigured HMAC key version\(s\): 1/,
  );
}

{
  const { calls, transaction, database } = fixture();
  const fullyConfigured = new LifecycleHmacKeyring([{ version: 1, secret: 'test-historical-key' }]);
  await createDeletedIdentityGuard(database, fullyConfigured).assertCanProvision(transaction, 'clerk', 'active-user');
  assert.deepEqual(calls, ['identity-lock']);
}

{
  const { calls, transaction, database } = fixture();
  const databaseFailure = new Error('Database unavailable');
  transaction.deletedAuthIdentityTombstone.findMany = async () => { throw databaseFailure; };
  await assert.rejects(
    createDeletedIdentityGuard(database, missingKeys).assertCanProvision(transaction, 'clerk', 'active-user'),
    (error) => error === databaseFailure,
  );
  assert.deepEqual(calls, ['identity-lock']);
}

console.log('Established identity resolution with missing historical keys tests passed.');
