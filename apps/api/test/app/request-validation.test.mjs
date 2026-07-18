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

  const malformedRequests = [
    { method: 'GET', url: '/api/imported-games/not-a-number' },
    { method: 'GET', url: '/api/imported-games?limit=not-a-number' },
    { method: 'POST', url: '/api/job-runs/not-a-number/cancel' },
    { method: 'GET', url: '/api/board-image?fen=startpos&pov=sideways' },
  ];

  for (const request of malformedRequests) {
    const response = await app.inject(request);
    assert.equal(response.statusCode, 400, `${request.method} ${request.url}`);
    assert.deepEqual(response.json(), { error: 'Validation failed' }, `${request.method} ${request.url}`);
  }

  console.log('Central request validation tests passed.');
} finally {
  await app.close();
}
