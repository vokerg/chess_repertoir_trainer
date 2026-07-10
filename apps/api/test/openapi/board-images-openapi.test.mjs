import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const app = await buildApp({ logger: false });
try {
  await app.ready();
  const document = app.swagger();
  assert.equal(document.paths['/api/board-image-url'].get.operationId, 'getBoardImageUrl');
  assert.equal(document.paths['/api/board-image'].get.operationId, 'redirectToBoardImage');

  const urlResponse = await app.inject({ method: 'GET', url: '/api/board-image-url?fen=startpos' });
  assert.equal(urlResponse.statusCode, 200);
  assert.match(urlResponse.json().url, /^https:\/\/fen2image\.chessvision\.ai\//);

  const redirect = await app.inject({ method: 'GET', url: '/api/board-image?fen=startpos' });
  assert.equal(redirect.statusCode, 302);
  assert.match(redirect.headers.location, /^https:\/\/fen2image\.chessvision\.ai\//);

  const invalid = await app.inject({ method: 'GET', url: '/api/board-image-url?fen=invalid' });
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.json().error, /Invalid FEN/);

  console.log('Board image OpenAPI and route tests passed.');
} finally {
  await app.close();
}
