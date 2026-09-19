import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.LICHESS_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

const { encryptToken, decryptToken } = await import('../../dist/services/oauthTokenCrypto.js');

const plainText = 'secret-token-value';
const encrypted = encryptToken(plainText);

assert.notEqual(encrypted.ciphertext, plainText);
assert.ok(encrypted.iv);
assert.ok(encrypted.authTag);
assert.equal(decryptToken(encrypted), plainText);

console.log('OAuth token crypto tests passed.');
