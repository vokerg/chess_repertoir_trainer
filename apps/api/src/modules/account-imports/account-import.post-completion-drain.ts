export const ACCOUNT_IMPORT_POST_COMPLETION_DRAIN_LIMIT = 20;

export async function drainAccountImportPostCompletion(
  reconcileNext: () => Promise<boolean>,
  limit = ACCOUNT_IMPORT_POST_COMPLETION_DRAIN_LIMIT,
): Promise<number> {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error('Account import post-completion drain limit must be a positive integer.');
  }

  let reconciled = 0;
  while (reconciled < limit && await reconcileNext()) {
    reconciled += 1;
  }
  return reconciled;
}
