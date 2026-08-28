import assert from 'node:assert/strict';
import {
  OnboardingCommandDispositionBlockedError,
  createOnboardingCommandRepository,
} from '../../dist/modules/onboarding/onboarding-command.repository.prisma.js';

let mutationQueries = 0;
const transaction = {
  async $executeRaw() { return 0; },
  dataLifecycleResourceFence: {
    async findFirst() {
      return {
        operationId: 91,
        resourceType: 'USER',
        resourceId: 5,
      };
    },
  },
  async $queryRaw() {
    mutationQueries += 1;
    throw new Error('Disposition mutation must not run while the lifecycle fence is active.');
  },
};
const database = {
  async $transaction(callback) {
    return callback(transaction);
  },
};
const repository = createOnboardingCommandRepository(database);
const changedAt = new Date('2026-08-28T10:00:00.000Z');

for (const command of [
  () => repository.skip(5, changedAt),
  () => repository.finishWithAttention(5, 11, changedAt),
]) {
  await assert.rejects(command(), (error) => {
    assert.ok(error instanceof OnboardingCommandDispositionBlockedError);
    assert.equal(error.code, 'ONBOARDING_INVALID_STATE');
    assert.match(error.message, /active data lifecycle operation/i);
    return true;
  });
}

assert.equal(mutationQueries, 0);
console.log('Onboarding disposition lifecycle fence tests passed.');
