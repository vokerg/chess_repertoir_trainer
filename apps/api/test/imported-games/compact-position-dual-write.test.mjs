import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { decodeNormalizedFenCompact, encodeNormalizedFen, encodeNormalizedFenCompact } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import { findOrCreatePositionByFen, upsertPositionAnalysesBulk, getPositionAnalysisByFen, getPositionAnalysisByPositionId, getPositionAnalysesByFens, getImportedGamePliesForBatchAnalysis } from '../../dist/modules/analysis/analysis.repository.prisma.js';
import { replacePlyRowsForGame } from '../../dist/modules/imported-games/ply-index.repository.prisma.js';
import { findOpeningPositionByNormalizedFen } from '../../dist/modules/imported-games/opening-analysis.repository.prisma.js';
import { findOpeningExplorerCache, upsertOpeningExplorerCache } from '../../dist/modules/opening-explorer/opening-explorer.repository.prisma.js';
import { findCourseExtensionPositions, findCourseExtensionCandidatePlies } from '../../dist/modules/lab/course-extension-candidates/course-extension-candidates.repository.prisma.js';
import { findImportedGameById, findImportedGamesForOpeningStruggles } from '../../dist/modules/imported-games/imported-games.repository.prisma.js';
import { getImportedGameForTagging } from '../../dist/modules/imported-games/game-tagging.repository.prisma.js';
import { findGamePliesThrough } from '../../dist/modules/scenario-training/scenario-training.repository.prisma.js';
import { getCourseReviewPlies } from '../../dist/modules/repertoire-coverage/repertoire-coverage.repository.prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';

// This suite intentionally corrupts rollback fields, exclusively on a disposable local DB.
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
const prisma = prismaModule.default;
const fens = ['4K3', '3K4', '2K5', '1K6'].map(rank => `7k/8/8/8/8/8/${rank}/8 w - -`);
const [singleFen, bulkFen, plyFen, nullFen] = fens;
const key = fen => new Uint8Array(positionKeyForNormalizedFen(fen));
const suffix = randomUUID();
const positionIds = [];
let userId;
try {
  await prisma.position.deleteMany({ where: { positionDataCompact: { in: fens.map(encodeNormalizedFenCompact) } } });
  const baseline = encodeNormalizedFen(nullFen);
  const legacy = await prisma.position.create({ data: { normalizedFen: nullFen, positionKey: key(nullFen), positionData: baseline } });
  positionIds.push(legacy.id);
  await assert.rejects(findOrCreatePositionByFen(`${nullFen} 0 1`), /compact invariant failed.*unique conflict/);
  assert.equal(await findOpeningPositionByNormalizedFen(nullFen), null, 'compact miss must not resolve a legacy-only row');
  assert.equal((await prisma.position.findUnique({ where: { id: legacy.id } })).positionDataCompact, null);

  const concurrent = await Promise.all(Array.from({ length: 4 }, () => findOrCreatePositionByFen(`${singleFen} 0 1`)));
  assert.ok(concurrent.every(row => row.id === concurrent[0].id), 'concurrent creation resolves the same compact identity');
  const single = await prisma.position.findUnique({ where: { id: concurrent[0].id } });
  positionIds.push(single.id);
  assert.equal(decodeNormalizedFenCompact(single.positionDataCompact), single.normalizedFen);
  assert.deepEqual(single.positionKey, key(singleFen));
  assert.equal(single.positionData, null);

  const analyses = await upsertPositionAnalysesBulk([
    { fen: `${bulkFen} 0 1`, bestScoreCpWhite: 1, persistenceMode: 'compact' },
    { fen: `${bulkFen} 5 11`, bestScoreCpWhite: 2, persistenceMode: 'compact' },
    { fen: `${singleFen} 0 1`, bestScoreCpWhite: 3, persistenceMode: 'compact' },
  ]);
  assert.equal(analyses.length, 2, 'compact deduplication preserves last input semantics');
  assert.equal(analyses.find(row => row.normalizedFen === bulkFen).bestScoreCpWhite, 2);
  const bulk = await prisma.position.findUnique({ where: { positionDataCompact: encodeNormalizedFenCompact(bulkFen) } });
  positionIds.push(bulk.id);
  assert.equal(bulk.normalizedFen, bulkFen);
  assert.deepEqual(bulk.positionKey, key(bulkFen));
  assert.equal(decodeNormalizedFenCompact(bulk.positionDataCompact), bulkFen);

  const user = await prisma.appUser.create({ data: { displayName: `compact-runtime-${suffix}` } });
  userId = user.id;
  const account = await prisma.externalAccount.create({ data: { userId, provider: 'LICHESS', username: `compact-runtime-${suffix}` } });
  const game = await prisma.importedGame.create({ data: { userId, accountId: account.id, provider: 'LICHESS', providerGameId: `compact-runtime-${suffix}`, userColor: 'WHITE' } });
  const rows = [plyFen, plyFen, singleFen].map((normalizedFen, index) => ({ importedGameId: game.id, plyNumber: index + 1, normalizedFen, moveUci: 'c2c3' }));
  await replacePlyRowsForGame(game.id, rows);
  const plyPosition = await prisma.position.findUnique({ where: { positionDataCompact: encodeNormalizedFenCompact(plyFen) } });
  positionIds.push(plyPosition.id);
  assert.equal(plyPosition.normalizedFen, plyFen);
  assert.deepEqual(plyPosition.positionKey, key(plyFen));
  assert.equal(decodeNormalizedFenCompact(plyPosition.positionDataCompact), plyFen);

  const now = new Date();
  const cache = await upsertOpeningExplorerCache({ normalizedFen: singleFen, source: 'MASTERS', profileVersion: 1,
    sinceYear: 1952, untilYear: 2026, movesLimit: 12, topGamesLimit: 4, payload: {}, fetchedAt: now, expiresAt: new Date(now.getTime() + 60000) });
  assert.equal(cache.positionId, single.id, 'MastersExplorerCache retains its Position FK');

  // Deliberately alter BOTH legacy fields after canonical creation.
  for (const row of [single, bulk, plyPosition]) {
    await prisma.position.update({ where: { id: row.id }, data: { positionKey: randomBytes(16), normalizedFen: `shadow-corrupted-${row.id}` } });
  }
  assert.equal((await findOrCreatePositionByFen(`${singleFen} 17 42`)).id, single.id);
  assert.equal((await getPositionAnalysisByFen(`${singleFen} 0 1`)).positionId, single.id);
  const lookup = await getPositionAnalysesByFens([`${bulkFen} 0 1`, `${singleFen} 0 1`, `${bulkFen} 42 7`]);
  assert.deepEqual(lookup.map(row => row.normalizedFen).sort(), [singleFen, bulkFen].sort());
  for (const row of [single, bulk, plyPosition]) {
    assert.deepEqual(await findOpeningPositionByNormalizedFen(row.normalizedFen), { id: row.id, normalizedFen: row.normalizedFen });
  }
  assert.deepEqual((await findCourseExtensionPositions([singleFen, bulkFen, singleFen])).map(row => row.id).sort((a,b) => a-b), [single.id, bulk.id].sort((a,b) => a-b));
  const cached = await findOpeningExplorerCache(singleFen, 'MASTERS', 1);
  assert.equal(cached.id, cache.id);
  assert.equal(cached.normalizedFen, singleFen);
  assert.equal(await findOpeningExplorerCache(singleFen, 'MASTERS', 2), null);
  const storedAgain = await upsertPositionAnalysesBulk([{ fen: `${singleFen} 0 1`, bestScoreCpWhite: 5, persistenceMode: 'compact' }]);
  assert.equal(storedAgain[0].positionId, single.id, 'skipDuplicates resolves by compact despite shadow corruption');
  await replacePlyRowsForGame(game.id, rows);
  const plies = await prisma.importedGamePly.findMany({ where: { importedGameId: game.id }, orderBy: { plyNumber: 'asc' } });
  assert.deepEqual(plies.map(row => row.positionId), [plyPosition.id, plyPosition.id, single.id]);
  assert.equal(await prisma.position.count({ where: { positionDataCompact: { in: fens.map(encodeNormalizedFenCompact) } } }), 3);

  const readers = [
    async () => (await findImportedGameById(userId, game.id)).plies,
    async () => (await getImportedGameForTagging(userId, game.id)).plies,
    async () => (await findImportedGamesForOpeningStruggles(userId, {}, 20))[0].plies,
    () => findGamePliesThrough(userId, game.id, 20),
    () => getCourseReviewPlies([game.id]),
    () => getImportedGamePliesForBatchAnalysis(userId, game.id),
    () => findCourseExtensionCandidatePlies(userId, [single.id, plyPosition.id], {}),
  ];
  for (const read of readers) {
    const hydrated = await read();
    assert.ok(hydrated.length > 0);
    for (const ply of hydrated) {
      assert.ok([singleFen, plyFen].includes(ply.position.normalizedFen));
      assert.equal(Object.hasOwn(ply.position, 'positionDataCompact'), false);
      assert.equal(Object.hasOwn(ply.position, 'id'), false);
      if (ply.position.analysis?.position) assert.equal(ply.position.analysis.position.normalizedFen, singleFen);
    }
  }

  await prisma.position.update({ where: { id: single.id }, data: { positionDataCompact: null } });
  for (const read of readers) await assert.rejects(read(), new RegExp(`compact invariant failed: id=${single.id}.*NULL`));
  await assert.rejects(getPositionAnalysisByPositionId(single.id), /NULL positionDataCompact/);
  await prisma.position.update({ where: { id: single.id }, data: { positionDataCompact: new Uint8Array([1]) } });
  await assert.rejects(getPositionAnalysisByPositionId(single.id), new RegExp(`compact invariant failed: id=${single.id}.*Invalid compact`));
  await prisma.position.update({ where: { id: single.id }, data: { positionDataCompact: single.positionDataCompact } });
  assert.deepEqual((await prisma.position.findUnique({ where: { id: legacy.id } })).positionData, baseline);
  console.log('Compact runtime identity, shadow independence, dual-write, concurrent creation, FK and invariant tests passed.');
} finally {
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.position.deleteMany({ where: { id: { in: positionIds } } });
  await prisma.$disconnect();
}
