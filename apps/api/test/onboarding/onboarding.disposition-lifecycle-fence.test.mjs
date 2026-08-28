import assert from 'node:assert/strict';
import {
  OnboardingCommandDispositionBlockedError,
  createOnboardingCommandRepository,
} from '../../dist/modules/onboarding/onboarding-command.repository.prisma.js';

let mutationQueries = 0;
const database = {
  async $queryRaw() {
    mutationQueries += 1;
    const error = new Error(
      'Raw query failed. Code: P0001. Message: ERROR: DATA_LIFECYCLE_WRITE_BLOCKED',
    );
    error.code = 'P2010';
    error.meta = {
      code: 'P0001',
      message: 'ERROR: DATA_LIFECYCLE_WRITE_BLOCKED DETAIL: operation=91 resource=USER:5',
    };
    throw error;
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

assert.equal(mutationQueries, 2);
console.log('Onboarding disposition lifecycle fence tests passed.');
