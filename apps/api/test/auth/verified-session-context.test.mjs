import assert from 'node:assert/strict';
import { normalizeVerifiedSessionContext } from '../../dist/auth/verified-session-context.js';

const requiredClaims = {
  sid: 'sess_123',
  v: 2,
  iat: 1_722_800_000,
  azp: 'http://localhost:4200',
  fva: [0, -1],
};

const sessionWithoutJwtId = normalizeVerifiedSessionContext(requiredClaims, 'user_admin');
assert.ok(sessionWithoutJwtId, 'a verified Clerk v2 session does not require an optional jti claim');
assert.equal(sessionWithoutJwtId.jwtId, undefined);

const sessionWithJwtId = normalizeVerifiedSessionContext(
  { ...requiredClaims, jti: 'jwt_123' },
  'user_admin',
);
assert.ok(sessionWithJwtId);
assert.equal(sessionWithJwtId.jwtId, 'jwt_123');

assert.equal(
  normalizeVerifiedSessionContext({ sid: 'sess_123', v: 2 }, 'user_admin'),
  null,
  'the signed issued-at claim remains required',
);

console.log('Verified Clerk session context tests passed.');
