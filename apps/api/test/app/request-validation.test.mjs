import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const app = await buildApp({
  logger: false,
  authConfig: { mode: 'dev-single-user', userId: 1 },
});

try {
  await app.ready();

  const malformedRequests = [
    { method: 'GET', url: '/api/imported-games/not-a-number' },
    { method: 'GET', url: '/api/imported-games?limit=not-a-number' },
    { method: 'POST', url: '/api/imported-games/batch-analysis-runs', payload: { gameIds: [] } },
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
