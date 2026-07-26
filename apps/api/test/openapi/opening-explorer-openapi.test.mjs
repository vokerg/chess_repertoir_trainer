import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const existingDevUser = await prisma.appUser.findUnique({
  where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
});
const devUser = existingDevUser ?? await prisma.appUser.create({
  data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
});

const app = await buildApp({
  logger: false,
  authConfig: { mode: 'dev-single-user', userId: devUser.id },
});

try {
  await app.ready();
  const document = app.swagger();

  const mastersOperation = document.paths['/api/masters-explorer'].get;
  assert.equal(mastersOperation.operationId, 'getMastersExplorerPosition');
  assert.deepEqual(mastersOperation.tags, ['Masters explorer']);
  assert.ok(mastersOperation.responses['200']);
  assert.ok(mastersOperation.responses['400']);
  assert.ok(mastersOperation.responses['401']);
  assert.ok(mastersOperation.responses['503']);

  const lichessGamesOperation = document.paths['/api/lichess-games-explorer'].get;
  assert.equal(lichessGamesOperation.operationId, 'getLichessGamesExplorerPosition');
  assert.deepEqual(lichessGamesOperation.tags, ['Lichess games explorer']);
  assert.ok(lichessGamesOperation.responses['200']);
  assert.ok(lichessGamesOperation.responses['400']);
  assert.ok(lichessGamesOperation.responses['401']);
  assert.ok(lichessGamesOperation.responses['503']);

  const filtered = await app.inject({
    method: 'GET',
    url: '/api/lichess-games-explorer?since=2024-01&until=2024-12&ratings=1600,1800&speeds=blitz,rapid&fen=not-a-fen',
  });
  assert.equal(filtered.statusCode, 400);
  assert.deepEqual(filtered.json(), {
    error: 'The supplied FEN is invalid.',
    code: 'INVALID_FEN',
  });

  const invalidFilter = await app.inject({
    method: 'GET',
    url: '/api/lichess-games-explorer?ratings=1700',
  });
  assert.equal(invalidFilter.statusCode, 400);
  assert.deepEqual(invalidFilter.json(), { error: 'Validation failed' });

  for (const url of [
    '/api/masters-explorer?fen=not-a-fen',
    '/api/lichess-games-explorer?fen=not-a-fen',
  ]) {
    const invalid = await app.inject({ method: 'GET', url });
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(invalid.json(), {
      error: 'The supplied FEN is invalid.',
      code: 'INVALID_FEN',
    });
  }

  for (const url of [
    '/api/masters-explorer?fen=',
    '/api/lichess-games-explorer?fen=',
  ]) {
    const malformed = await app.inject({ method: 'GET', url });
    assert.equal(malformed.statusCode, 400);
    assert.deepEqual(malformed.json(), { error: 'Validation failed' });
  }

  console.log('Opening explorer OpenAPI and route tests passed.');
} finally {
  await app.close();
}
