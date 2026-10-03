import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import { CurrentAppUserService } from '../../dist/auth/current-app-user.service.js';
import prismaModule from '../../dist/prisma.js';
import {
  gameLibrarySchema, gameLibraryNameSchema, importedGameSearchQuerySchema,
  importedGameSearchResponseSchema,
} from '@chess-trainer/contracts/imported-games';

const prisma = prismaModule.default;
const users = [];
const apps = [];
// Dev mode has one fixed external identity. Supply deterministic independent test users.
const originalResolve = CurrentAppUserService.resolveDevUser;
CurrentAppUserService.resolveDevUser = async (userId) => ({ auth: { userId, provider: 'test', externalSubject: `libraries-${userId}` } });
try {
  for (const suffix of ['owner', 'other']) {
    const user = await prisma.appUser.create({ data: { displayName: `libraries-${suffix}-${randomUUID()}` } });
    users.push(user.id);
    const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId: user.id }, prisma: { $disconnect: async () => {} } });
    await app.ready();
    apps.push(app);
  }
  const [app, otherApp] = apps;
  const preflight = await app.inject({ method: 'OPTIONS', url: '/api/imported-games/1/like', headers: {
    origin: 'http://localhost:4200', 'access-control-request-method': 'PUT',
  } });
  assert.ok(preflight.headers['access-control-allow-methods'].includes('PUT'));
  const account = await prisma.externalAccount.create({ data: { userId: users[0], provider: 'LICHESS', username: randomUUID() } });
  const games = [];
  for (let i = 0; i < 3; i++) {
    games.push(await prisma.importedGame.create({ data: { userId: users[0], accountId: account.id, provider: 'LICHESS', providerGameId: randomUUID(), endedAt: new Date(2020, 0, i + 1) } }));
  }
  async function request(method, url, payload, status = 200, client = app) {
    const response = await client.inject({ method, url, ...(payload === undefined ? {} : { payload }) });
    assert.equal(response.statusCode, status, `${method} ${url}: ${response.body}`);
    return response.json();
  }
  const library = await request('POST', '/api/game-libraries', { name: '  Endgames  ' }, 201);
  assert.deepEqual(gameLibrarySchema.parse(library), { id: library.id, name: 'Endgames', gameCount: 0 });
  const second = await request('POST', '/api/game-libraries', { name: 'Study' }, 201);
  assert.equal(gameLibraryNameSchema.safeParse({ name: '  ' }).success, false);
  assert.equal(gameLibrarySchema.safeParse({ ...library, gameCount: -1 }).success, false);
  assert.deepEqual(await request('POST', '/api/game-libraries', { name: ' ' }, 400), { error: 'Validation failed' });
  await request('POST', '/api/game-libraries', { name: 'a'.repeat(101) }, 400);
  await request('PUT', `/api/imported-games/${games[0].id}/like`, { liked: 'true' }, 400);
  assert.equal(importedGameSearchQuerySchema.safeParse({ liked: 'false', libraryId: library.id }).data.liked, false);
  await request('GET', '/api/imported-games?libraryId=0', undefined, 400);
  assert.deepEqual((await request('GET', '/api/game-libraries', undefined, 200, otherApp)).items, []);
  const entry = `/api/game-libraries/${library.id}/games/${games[0].id}`;
  await request('PUT', entry, {});
  await request('PUT', entry, {}); // Idempotent membership.
  await request('PUT', `/api/game-libraries/${second.id}/games/${games[0].id}`, {});
  await request('PUT', `/api/game-libraries/${library.id}/games/${games[1].id}`, {});
  const like = `/api/imported-games/${games[0].id}/like`;
  await request('PUT', like, { liked: true });
  await request('PUT', like, { liked: true });
  assert.equal((await request('GET', '/api/game-libraries')).items.find((item) => item.id === library.id).gameCount, 2);
  const liked = importedGameSearchResponseSchema.parse(await request('GET', '/api/imported-games?liked=true'));
  assert.deepEqual(liked.items.map((item) => item.id), [games[0].id]);
  assert.equal(liked.items[0].liked, true);
  assert.deepEqual(liked.items[0].libraryIds.sort((a, b) => a - b), [library.id, second.id]);
  assert.equal(liked.appliedFilters.liked, true);
  const first = await request('GET', `/api/imported-games?libraryId=${library.id}&limit=1`);
  assert.equal(first.items[0].id, games[1].id);
  assert.equal(first.pageInfo.hasMore, true);
  const next = await request('GET', `/api/imported-games?libraryId=${library.id}&limit=1&cursor=${encodeURIComponent(first.pageInfo.nextCursor)}`);
  assert.equal(next.items[0].id, games[0].id);
  assert.equal(next.pageInfo.hasMore, false);
  assert.equal((await request('GET', `/api/imported-games?libraryId=${library.id}&liked=true`)).items.length, 1);
  for (const [method, url, payload] of [
    ['PUT', like, { liked: false }],
    ['PATCH', `/api/game-libraries/${library.id}`, { name: 'Stolen' }],
    ['DELETE', `/api/game-libraries/${library.id}`],
    ['PUT', entry, {}], ['DELETE', entry],
  ]) await request(method, url, payload, 404, otherApp);
  const foreignLibrary = await request('POST', '/api/game-libraries', { name: 'Other user' }, 201, otherApp);
  await request('PUT', `/api/game-libraries/${foreignLibrary.id}/games/${games[0].id}`, {}, 404, otherApp);
  await request('PUT', `/api/game-libraries/${foreignLibrary.id}/games/${games[0].id}`, {}, 404);
  assert.equal((await request('GET', `/api/imported-games?libraryId=${library.id}`, undefined, 200, otherApp)).items.length, 0);
  await request('PATCH', `/api/game-libraries/${library.id}`, { name: 'Renamed' });
  await request('DELETE', entry);
  await request('DELETE', entry); // Idempotent removal.
  assert.equal((await request('GET', '/api/imported-games?liked=true')).items[0].liked, true);
  await request('DELETE', `/api/game-libraries/${second.id}`);
  assert.equal(await prisma.importedGame.count({ where: { userId: users[0] } }), 3);
  assert.equal((await request('GET', '/api/imported-games?liked=true')).items[0].libraryIds.length, 0);
  await request('PUT', like, { liked: false });
  assert.equal((await request('GET', '/api/imported-games?liked=true')).items.length, 0);
  await prisma.importedGame.delete({ where: { id: games[1].id } });
  assert.equal(await prisma.gameLibraryEntry.count({ where: { libraryId: library.id } }), 0);
  await request('PUT', entry + '999999', {}, 404);
  const document = app.swagger();
  assert.equal(document.paths['/api/game-libraries'].post.operationId, 'createGameLibrary');
  assert.ok(document.paths['/api/imported-games/{gameId}/like'].put.responses['404']);
  assert.ok(document.paths['/api/game-libraries/{libraryId}/games/{gameId}'].put.responses['401']);
  console.log('Game libraries: HTTP contracts, ownership, persistence, pagination, idempotence, cascades, and OpenAPI passed.');
} finally {
  CurrentAppUserService.resolveDevUser = originalResolve;
  await Promise.all(apps.map((app) => app.close()));
  await prisma.appUser.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}
