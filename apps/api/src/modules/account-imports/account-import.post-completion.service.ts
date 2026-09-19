import { AccountRatingStatsService } from '../../services/accountRatingStatsService';
import {
  AccountImportPostCompletionRepository,
  type AccountImportPostCompletionRepository as PostCompletionRepository,
} from './account-import.post-completion.repository.prisma';

interface RatingStatsBoundary {
  recomputeForAccount(userId: number, accountId: number): Promise<unknown | null>;
}

export interface AccountImportPostCompletionService {
  reconcileNext(): Promise<boolean>;
}

export function createAccountImportPostCompletionService(dependencies: {
  repository?: PostCompletionRepository;
  ratingStats?: RatingStatsBoundary;
} = {}): AccountImportPostCompletionService {
  const repository = dependencies.repository ?? AccountImportPostCompletionRepository;
  const ratingStats = dependencies.ratingStats ?? AccountRatingStatsService;

  return {
    async reconcileNext() {
      const candidate = await repository.findNextCandidate();
      if (!candidate) return false;

      let expectedCompletedImportRunId = candidate.latestCompletedImportRunId;
      for (;;) {
        const recomputed = await ratingStats.recomputeForAccount(
          candidate.userId,
          candidate.accountId,
        );
        if (recomputed === null) return true;

        const state = await repository.getState(candidate.userId, candidate.accountId);
        if (state.hasActiveImport || state.latestCompletedImportRunId === null) break;
        if (state.latestCompletedImportRunId === expectedCompletedImportRunId) break;

        expectedCompletedImportRunId = state.latestCompletedImportRunId;
      }

      await repository.synchronizeForwardSyncMetadata(candidate.userId, candidate.accountId);
      return true;
    },
  };
}

export const AccountImportPostCompletionService = createAccountImportPostCompletionService();
