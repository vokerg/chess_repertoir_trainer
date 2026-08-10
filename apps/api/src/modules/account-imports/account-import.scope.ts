import { createHash } from 'node:crypto';
import {
  accountImportScopeSchema,
  accountImportScopeVersionSchema,
  type AccountImportScope,
} from '@chess-trainer/contracts';

const SPEED_ORDER = ['BULLET', 'BLITZ', 'RAPID'] as const;
const SPEED_RANK = new Map(SPEED_ORDER.map((speed, index) => [speed, index]));

export const ACCOUNT_IMPORT_SCOPE_VERSION = accountImportScopeVersionSchema.value;

export interface CanonicalAccountImportScope {
  scopeVersion: typeof ACCOUNT_IMPORT_SCOPE_VERSION;
  scopeHash: string;
  scope: AccountImportScope;
}

export function canonicalizeAccountImportScope(input: AccountImportScope): CanonicalAccountImportScope {
  const parsed = accountImportScopeSchema.parse(input);
  const scope: AccountImportScope = {
    variant: parsed.variant,
    speeds: [...parsed.speeds].sort((left, right) => (
      (SPEED_RANK.get(left) ?? Number.MAX_SAFE_INTEGER)
      - (SPEED_RANK.get(right) ?? Number.MAX_SAFE_INTEGER)
    )),
    rated: parsed.rated,
  };
  const serialized = JSON.stringify({
    scopeVersion: ACCOUNT_IMPORT_SCOPE_VERSION,
    variant: scope.variant,
    speeds: scope.speeds,
    rated: scope.rated,
  });

  return {
    scopeVersion: ACCOUNT_IMPORT_SCOPE_VERSION,
    scopeHash: createHash('sha256').update(serialized).digest('hex'),
    scope,
  };
}
