import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const app = await buildApp({
  logger: false,
  authConfig: { mode: 'dev-single-user', userId: 1 },
  prisma: { $disconnect: async () => {} },
});
try {
  await app.ready();
  const document = app.swagger();
  assert.equal(document.paths['/api/board-image-url'].get.operationId, 'getBoardImageUrl');
  assert.equal(document.paths['/api/board-image'].get.operationId, 'redirectToBoardImage');
  const redirectContract = document.paths['/api/board-image'].get.responses['302'];
  assert.equal(redirectContract.description, 'Redirect with no response body.');
  assert.equal(redirectContract.headers.Location.schema.format, 'uri');
  assert.equal(redirectContract.headers['Cache-Control'].schema.example, 'public, max-age=86400');
  assert.deepEqual(redirectContract.content['application/json'].schema.not, {});
  assert.equal(JSON.stringify(redirectContract).includes('BoardImageUrlResponse'), false);

  const urlResponse = await app.inject({ method: 'GET', url: '/api/board-image-url?fen=startpos' });
  assert.equal(urlResponse.statusCode, 200);
  assert.match(urlResponse.json().url, /^https:\/\/fen2image\.chessvision\.ai\//);

  const redirect = await app.inject({ method: 'GET', url: '/api/board-image?fen=startpos' });
  assert.equal(redirect.statusCode, 302);
  assert.match(redirect.headers.location, /^https:\/\/fen2image\.chessvision\.ai\//);
  assert.equal(redirect.headers['cache-control'], 'public, max-age=86400');
  assert.equal(redirect.body, '');

  const malformed = await app.inject({ method: 'GET', url: '/api/board-image?pov=sideways&fen=startpos' });
  assert.equal(malformed.statusCode, 400);
  assert.deepEqual(malformed.json(), { error: 'Validation failed' });

  const invalid = await app.inject({ method: 'GET', url: '/api/board-image-url?fen=invalid' });
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.json().error, /Invalid FEN/);

  console.log('Board image OpenAPI and route tests passed.');
} finally {
  await app.close();
}
