import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { decodeNormalizedFenCompact, encodeNormalizedFen } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import { findOrCreatePositionByFen, upsertPositionAnalysesBulk, getPositionAnalysesByFens } from '../../dist/modules/analysis/analysis.repository.prisma.js';
import { replacePlyRowsForGame } from '../../dist/modules/imported-games/ply-index.repository.prisma.js';
import { findOpeningPositionByNormalizedFen } from '../../dist/modules/imported-games/opening-analysis.repository.prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';

const prisma = prismaModule.default;
const fens = ['4K3', '3K4', '2K5', '1K6'].map(rank => `7k/8/8/8/8/8/${rank}/8 w - -`);
const [singleFen, bulkFen, plyFen, legacyFen] = fens;
const key = fen => new Uint8Array(positionKeyForNormalizedFen(fen));
const suffix = randomUUID();
let userId;
try {
  await prisma.position.deleteMany({ where: { normalizedFen: { in: fens } } });
  const baseline = encodeNormalizedFen(legacyFen);
  const legacy = await prisma.position.create({ data: { normalizedFen: legacyFen, positionKey: key(legacyFen), positionData: baseline } });
  assert.equal(legacy.positionDataCompact, null);
  assert.equal((await findOrCreatePositionByFen(`${legacyFen} 0 1`)).id, legacy.id);
  assert.equal((await prisma.position.findUnique({ where: { id: legacy.id } })).positionDataCompact, null, 'existing rows resolve normally without a shadow value');

  const single = await findOrCreatePositionByFen(`${singleFen} 0 1`);
  assert.equal(decodeNormalizedFenCompact(single.positionDataCompact), single.normalizedFen);
  assert.deepEqual(single.positionKey, key(singleFen));
  assert.equal(single.positionData, null, 'new writes do not repurpose the fixed pilot');
  assert.equal((await findOrCreatePositionByFen(`${singleFen} 17 42`)).id, single.id);

  const analyses = await upsertPositionAnalysesBulk([
    { fen: `${bulkFen} 0 1`, bestScoreCpWhite: 1, persistenceMode: 'compact' },
    { fen: `${bulkFen} 5 11`, bestScoreCpWhite: 2, persistenceMode: 'compact' },
    { fen: `${legacyFen} 0 1`, bestScoreCpWhite: 3, persistenceMode: 'compact' },
  ]);
  assert.equal(analyses.length, 2, 'createMany/dedupe/skipDuplicates still resolves by position key');
  const bulk = await prisma.position.findUnique({ where: { positionKey: key(bulkFen) } });
  assert.equal(decodeNormalizedFenCompact(bulk.positionDataCompact), bulkFen);
  assert.equal(bulk.positionData, null);
  assert.equal((await getPositionAnalysesByFens([`${bulkFen} 0 1`, `${legacyFen} 0 1`])).length, 2, 'existing batch analysis hash lookups still work');

  const user = await prisma.appUser.create({ data: { displayName: `compact-dual-${suffix}` } });
  userId = user.id;
  const account = await prisma.externalAccount.create({ data: { userId, provider: 'LICHESS', username: `compact-dual-${suffix}` } });
  const game = await prisma.importedGame.create({ data: { userId, accountId: account.id, provider: 'LICHESS', providerGameId: `compact-dual-${suffix}` } });
  const rows = [plyFen, plyFen, legacyFen].map((normalizedFen, index) => ({ importedGameId: game.id, plyNumber: index + 1, normalizedFen,
    positionKey: positionKeyForNormalizedFen(normalizedFen), moveUci: index === 2 ? 'b2b3' : 'c2c3' }));
  await replacePlyRowsForGame(game.id, rows);
  const plyPosition = await prisma.position.findUnique({ where: { positionKey: key(plyFen) } });
  assert.equal(decodeNormalizedFenCompact(plyPosition.positionDataCompact), plyFen);
  assert.equal(plyPosition.positionData, null);
  await replacePlyRowsForGame(game.id, rows);
  const plies = await prisma.importedGamePly.findMany({ where: { importedGameId: game.id }, orderBy: { plyNumber: 'asc' } });
  assert.deepEqual(plies.map(row => row.positionId), [plyPosition.id, plyPosition.id, legacy.id]);
  assert.equal(await prisma.position.count({ where: { normalizedFen: { in: fens } } }), 4);
  const storedLegacy = await prisma.position.findUnique({ where: { id: legacy.id } });
  assert.equal(storedLegacy.positionDataCompact, null, 'skipDuplicates never rewrites legacy shadow NULLs');
  assert.deepEqual(storedLegacy.positionData, baseline);
  assert.deepEqual(storedLegacy.positionKey, key(legacyFen));
  for (const row of [single, bulk, plyPosition, legacy]) {
    assert.deepEqual(await findOpeningPositionByNormalizedFen(row.normalizedFen), { id: row.id, normalizedFen: row.normalizedFen }, 'the existing hash lookup identity is unchanged');
  }
  console.log('Single analysis, bulk analysis and ply Position dual-write, legacy NULL, skipDuplicates and unchanged hash lookup tests passed.');
} finally {
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.position.deleteMany({ where: { normalizedFen: { in: fens } } });
  await prisma.$disconnect();
}
