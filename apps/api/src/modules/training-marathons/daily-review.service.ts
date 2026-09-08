import type { Prisma } from '@prisma/client';
import type { HashedAvailableSublineDto } from '../courses/sublines.service';
import {
  TRAINING_MODE_DAILY_REVIEW,
  TRAINING_MODE_DAILY_REVIEW_RETRY,
  TRAINING_MODE_LINE,
  TRAINING_MODE_MARATHON,
  TRAINING_MODE_MIXED_WEAK_UNTRAINED,
  TRAINING_MODE_UNTRAINED_SUBLINES,
  TRAINING_MODE_WEAK_SUBLINES,
} from '../training/training.constants';
import { addReviewDays, nextFailedReview, nextSuccessfulReview } from './daily-review.policy';
import {
  findReviewState,
  loadDueReviewIdentityKeys,
  reviewIdentityKey,
  seedReviewState,
  updateReviewState,
} from './daily-review.repository.prisma';

const REVIEW_SEEDING_TRAINING_MODES = new Set([
  TRAINING_MODE_LINE,
  TRAINING_MODE_MARATHON,
  TRAINING_MODE_WEAK_SUBLINES,
  TRAINING_MODE_UNTRAINED_SUBLINES,
  TRAINING_MODE_MIXED_WEAK_UNTRAINED,
]);

export const DailyReviewService = {
  loadDueSublines: async (
    userId: number,
    sublines: HashedAvailableSublineDto[],
    now = new Date(),
  ): Promise<HashedAvailableSublineDto[]> => {
    const dueKeys = await loadDueReviewIdentityKeys(userId, sublines, now);
    return sublines.filter((subline) =>
      dueKeys.has(
        reviewIdentityKey({
          lineId: subline.lineId,
          sublineHash: subline.hash,
          sublineKeyVersion: subline.canonicalKeyVersion,
        }),
      ),
    );
  },

  applyCompletedTrainingSession: async (
    transaction: Prisma.TransactionClient,
    userId: number,
    sessionId: number,
    result: string,
    completedAt: Date,
  ): Promise<void> => {
    const attempt = await transaction.trainingSublineAttempt.findFirst({
      where: { userId, trainingSessionId: sessionId },
      select: {
        lineId: true,
        sublineHash: true,
        sublineKeyVersion: true,
        trainingMode: true,
      },
    });
    if (
      !attempt ||
      attempt.trainingMode === TRAINING_MODE_DAILY_REVIEW_RETRY ||
      (result !== 'PASSED' && result !== 'FAILED')
    )
      return;

    const identity = {
      lineId: attempt.lineId,
      sublineHash: attempt.sublineHash,
      sublineKeyVersion: attempt.sublineKeyVersion,
    };
    if (REVIEW_SEEDING_TRAINING_MODES.has(attempt.trainingMode)) {
      const dueAt = result === 'FAILED' ? completedAt : addReviewDays(completedAt, 1);
      await seedReviewState(transaction, userId, identity, dueAt);
      return;
    }
    if (attempt.trainingMode !== TRAINING_MODE_DAILY_REVIEW) return;

    const state = await findReviewState(transaction, userId, identity);
    if (!state || state.lastTrainingSessionId === sessionId) return;
    if (result === 'PASSED') {
      const next = nextSuccessfulReview(state, completedAt);
      await updateReviewState(transaction, userId, identity, {
        ...next,
        lastTrainingSessionId: sessionId,
      });
      return;
    }
    await updateReviewState(transaction, userId, identity, {
      ...nextFailedReview(completedAt),
      failureCount: { increment: 1 },
      lastTrainingSessionId: sessionId,
    });
  },
};
