import type {
  ImportedGameWorkflowCandidates,
  ImportRunSummary,
} from '../data-access/accounts.models';

export interface NewImportedWorkflowState {
  readonly eligibleCount: number;
  readonly unindexedGameIds: readonly number[];
  readonly indexedGameIds: readonly number[];
}

const LICHESS_SCOPE_LABELS = [
  { scope: 'challenge:write', label: 'bot challenges' },
  { scope: 'puzzle:read', label: 'read puzzles' },
  { scope: 'puzzle:write', label: 'submit puzzle results' },
] as const;

export function buildNewImportedWorkflowState(
  result: ImportRunSummary,
  candidates: ImportedGameWorkflowCandidates | undefined,
): NewImportedWorkflowState {
  const eligibleImportedGameIds = unique(result.eligibleImportedGameIds ?? []);
  const importedGameIds = new Set(eligibleImportedGameIds);
  const eligibleUnindexedGameIds = new Set(candidates?.eligibleUnindexedGameIds ?? []);
  const eligibleIndexedGameIds = new Set(candidates?.eligibleIndexedGameIds ?? []);

  return {
    eligibleCount: eligibleImportedGameIds.length,
    unindexedGameIds: unique(result.eligibleUnindexedGameIds ?? []).filter(
      (gameId) => importedGameIds.has(gameId) && eligibleUnindexedGameIds.has(gameId),
    ),
    indexedGameIds: eligibleImportedGameIds.filter((gameId) => eligibleIndexedGameIds.has(gameId)),
  };
}

export function missingLichessScopeLabels(account: {
  readonly scopes: readonly string[];
}): readonly string[] {
  const grantedScopes = new Set(account.scopes);
  return LICHESS_SCOPE_LABELS.filter(({ scope }) => !grantedScopes.has(scope)).map(
    ({ label }) => label,
  );
}

function unique(values: readonly number[]): number[] {
  return Array.from(new Set(values));
}
