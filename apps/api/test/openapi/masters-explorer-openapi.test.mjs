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
  const operation = document.paths['/api/masters-explorer'].get;
  assert.equal(operation.operationId, 'getMastersExplorerPosition');
  assert.deepEqual(operation.tags, ['Masters explorer']);
  assert.ok(operation.responses['200']);
  assert.ok(operation.responses['400']);
  assert.ok(operation.responses['401']);
  assert.ok(operation.responses['503']);

  const invalid = await app.inject({
    method: 'GET',
    url: '/api/masters-explorer?fen=not-a-fen',
  });
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.json(), {
    error: 'The supplied FEN is invalid.',
    code: 'INVALID_FEN',
  });

  const malformed = await app.inject({
    method: 'GET',
    url: '/api/masters-explorer?fen=',
  });
  assert.equal(malformed.statusCode, 400);
  assert.deepEqual(malformed.json(), { error: 'Validation failed' });

  console.log('Masters explorer OpenAPI and route tests passed.');
} finally {
  await app.close();
}
