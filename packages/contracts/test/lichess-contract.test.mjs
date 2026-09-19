import assert from 'node:assert/strict';
import {
  lichessBotChallengeOptionsResponseSchema,
  lichessBotChallengeResponseSchema,
  lichessConnectionStatusSchema,
  lichessDisconnectResponseSchema,
} from '../dist/lichess/index.js';

{
  assert.deepEqual(lichessConnectionStatusSchema.parse({ connected: false }), {
    connected: false,
  });

  const connected = {
    connected: true,
    account: {
      username: 'vokerg',
      lichessUserId: 'lichess-user-id',
      externalAccountId: 42,
      scopes: ['challenge:write', 'puzzle:read'],
      connectedAt: '2026-08-11T05:00:00.000Z',
      expiresAt: null,
    },
  };
  assert.deepEqual(lichessConnectionStatusSchema.parse(connected), connected);
  assert.throws(() => lichessConnectionStatusSchema.parse({ connected: true }));
  assert.throws(() => lichessConnectionStatusSchema.parse({
    ...connected,
    account: { ...connected.account, connectedAt: 'not-a-date' },
  }));
}

{
  const options = {
    bots: [
      { username: 'maia1', label: 'Maia 1100' },
      { username: 'maia5', label: 'Maia 1500' },
    ],
    defaultUsername: 'maia5',
  };
  assert.deepEqual(lichessBotChallengeOptionsResponseSchema.parse(options), options);
  assert.throws(() => lichessBotChallengeOptionsResponseSchema.parse({ ...options, defaultUsername: 5 }));
}

{
  const challenge = {
    challengeId: 'challenge-1',
    url: 'https://lichess.org/challenge-1',
    username: 'maia5',
    rawStatus: 'created',
  };
  assert.deepEqual(lichessBotChallengeResponseSchema.parse(challenge), challenge);
  assert.throws(() => lichessBotChallengeResponseSchema.parse({ ...challenge, challengeId: 1 }));
}

{
  assert.deepEqual(lichessDisconnectResponseSchema.parse({ disconnected: true }), {
    disconnected: true,
  });
  assert.throws(() => lichessDisconnectResponseSchema.parse({ disconnected: false }));
}

console.log('Lichess integration contract tests passed.');
