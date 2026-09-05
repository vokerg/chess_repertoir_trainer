import type { Prisma } from '@prisma/client';
import type { HashedAvailableSublineDto } from '../courses/sublines.service';
import {
  TRAINING_MODE_DAILY_REVIEW,
  TRAINING_MODE_DAILY_REVIEW_RETRY,
  TRAINING_MODE_LINE,
} from '../training/training.constants';
import { addReviewDays, nextFailedReview, nextSuccessfulReview } from './daily-review.policy';
import {
  findReviewState,
  loadDueReviewIdentityKeys,
  reviewIdentityKey,
  seedReviewState,
  updateReviewState,
} from './daily-review.repository.prisma';

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
    if (!attempt || attempt.trainingMode === TRAINING_MODE_DAILY_REVIEW_RETRY) return;

    const identity = {
      lineId: attempt.lineId,
      sublineHash: attempt.sublineHash,
      sublineKeyVersion: attempt.sublineKeyVersion,
    };
    if (attempt.trainingMode === TRAINING_MODE_LINE) {
      await seedReviewState(transaction, userId, identity, addReviewDays(completedAt, 1));
      return;
    }
    if (
      attempt.trainingMode !== TRAINING_MODE_DAILY_REVIEW ||
      (result !== 'PASSED' && result !== 'FAILED')
    )
      return;

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
