import type { AdminRequestBudgetEnforcement } from '@chess-trainer/contracts/admin';

export interface AdminRequestBudgetInput {
  actorKey: string;
  operationId: string;
}

export interface AdminRequestBudgetDecision {
  enforcement: AdminRequestBudgetEnforcement;
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface AdminRequestBudget {
  check(input: AdminRequestBudgetInput): Promise<AdminRequestBudgetDecision>;
  enforcement(): AdminRequestBudgetEnforcement;
}

/**
 * The hosted deployment documentation does not guarantee one API replica and the
 * repository has no shared limiter. Keep strict query bounds and telemetry, but
 * do not emit 429 or claim distributed enforcement.
 */
export const UnenforcedAdminRequestBudget: AdminRequestBudget = {
  check: async () => ({ enforcement: 'UNENFORCED', allowed: true }),
  enforcement: () => 'UNENFORCED',
};
