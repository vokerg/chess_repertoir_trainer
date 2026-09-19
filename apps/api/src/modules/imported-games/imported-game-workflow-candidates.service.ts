import type { ExternalAccountWorkflowSummaryResponse } from '@chess-trainer/contracts/external-accounts';
import { ImportedGameWorkflowSummaryRepository } from './imported-game-workflow-summary.repository.prisma';

export const ImportedGameWorkflowCandidatesService = {
  forAccount: async (
    userId: number,
    accountId: number,
  ): Promise<ExternalAccountWorkflowSummaryResponse> => {
    const counts = await ImportedGameWorkflowSummaryRepository.forAccount(userId, accountId);
    return { accountId, ...counts };
  },
};
