import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authPlugin = readFileSync(
  new URL('../apps/api/src/auth/auth.plugin.ts', import.meta.url),
  'utf8',
);

assert.doesNotMatch(
  authPlugin,
  /modules\/account-imports|account-import|AccountImport|automatic-refresh|createNormalRefreshForUser|createAutomaticRefreshForUser/,
  'Authentication hook must not import, create, or trigger account-import work.',
);
assert.doesNotMatch(
  authPlugin,
  /providers\/(?:lichess|chess-com)|LichessAccountImport|ChessComAccountImport/,
  'Authentication hook must not traverse provider account-import adapters.',
);

console.log('Account-import authentication boundary passed.');
