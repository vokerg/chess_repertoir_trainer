import assert from 'node:assert/strict';
import {
  createOnboardingCommandService,
  OnboardingCommandInvalidStateError,
} from '../../dist/modules/onboarding/onboarding-command.service.js';
import { PreparationAdmissionBlockedError } from '../../dist/modules/preparation/preparation-admission.guard.js';

const now = new Date('2026-08-31T12:00:00.000Z');

const repository = {
  async getActiveRun() { return null; },
  async getDisposition() {
    return { disposition: 'PENDING', reason: null, changedAt: null };
  },
  async getLatestRun() { return null; },
};

const service = createOnboardingCommandService({
  repository,
  admissionRepository: {
    async admit() {
      throw new PreparationAdmissionBlockedError('Preparation is blocked by an active data lifecycle operation.');
    },
  },
  now: () => now,
});

await assert.rejects(
  () => service.start(101, 202),
  (error) => (
    error instanceof OnboardingCommandInvalidStateError
    && error.message === 'Preparation is blocked by an active data lifecycle operation.'
  ),
);

console.log('Onboarding preparation admission conflict tests passed.');
