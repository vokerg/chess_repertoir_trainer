const LICHESS_SCOPE_LABELS = [
  { scope: 'challenge:write', label: 'bot challenges' },
  { scope: 'puzzle:read', label: 'read puzzles' },
  { scope: 'puzzle:write', label: 'submit puzzle results' },
] as const;

export function missingLichessScopeLabels(account: {
  readonly scopes: readonly string[];
}): readonly string[] {
  const grantedScopes = new Set(account.scopes);
  return LICHESS_SCOPE_LABELS.filter(({ scope }) => !grantedScopes.has(scope)).map(
    ({ label }) => label,
  );
}
