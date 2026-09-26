import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { encodeUciMove } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import { replacePlyRowsForGame } from '../../dist/modules/imported-games/ply-index.repository.prisma.js';
import { ImportedGamePlyIndexService } from '../../dist/modules/imported-games/ply-index.service.js';
import { findImportedGameById, findImportedGamesForOpeningStruggles } from '../../dist/modules/imported-games/imported-games.repository.prisma.js';
import { getImportedGameForTagging } from '../../dist/modules/imported-games/game-tagging.repository.prisma.js';
import { findOpeningNextMoves, findOpeningTopGames } from '../../dist/modules/imported-games/opening-analysis.repository.prisma.js';
import { findCourseExtensionCandidatePlies } from '../../dist/modules/lab/course-extension-candidates/course-extension-candidates.repository.prisma.js';
import { getCourseReviewPlies } from '../../dist/modules/repertoire-coverage/repertoire-coverage.repository.prisma.js';
import { findGamePliesThrough } from '../../dist/modules/scenario-training/scenario-training.repository.prisma.js';
import { getImportedGamePliesForBatchAnalysis, getImportedGamePliesForAnalysisSummary, createRunningGameAnalysisRun, getLatestGameAnalysisForImportedGame } from '../../dist/modules/analysis/analysis.repository.prisma.js';
import { getLatestGameAnalysisRunDeterministic } from '../../dist/modules/analysis/analysis-run-lifecycle.repository.prisma.js';
import { findTacticalDetectionCandidatesForGames } from '../../dist/modules/lab/tactical-detections/tactical-detection.repository.prisma.js';
import { tacticalDetectionThresholds } from '../../dist/modules/lab/tactical-detections/tactical-detection.constants.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const normalizedFen = '8/P6k/8/8/8/8/8/7K w - -';
const positionKey = positionKeyForNormalizedFen(normalizedFen);
let userId;
const positionIds = [];
function assertUciPlies(rows, expected) {
  assert.deepEqual(rows.map((ply) => ply.moveUci), expected);
  for (const row of rows) assert.equal(Object.hasOwn(row, 'moveCode'), false, 'numeric storage stays inside repositories');
}
try {
  const user = await prisma.appUser.create({ data: { displayName: `ply-code-${suffix}` } });
  userId = user.id;
  const account = await prisma.externalAccount.create({ data: { userId, provider: 'LICHESS', username: `ply-code-${suffix}` } });
  const game = await prisma.importedGame.create({ data: {
    userId, accountId: account.id, provider: 'LICHESS', providerGameId: `ply-code-${suffix}`,
    userColor: 'WHITE', resultForUser: 'WIN', endedAt: new Date(),
  } });
  const moves = ['a7a8q', 'a7a8n', 'a7a8b', 'a7a8r', 'h1g1', 'a7a8q'];
  await replacePlyRowsForGame(game.id, moves.map((moveUci, index) => ({ importedGameId: game.id, plyNumber: index + 1, moveUci, normalizedFen, positionKey })));
  const stored = await prisma.importedGamePly.findMany({ where: { importedGameId: game.id }, orderBy: { plyNumber: 'asc' } });
  for (const [index, row] of stored.entries()) {
    assert.equal(row.moveCode, encodeUciMove(moves[index]), 'new indexed plies store compact codes');
    assert.equal(row.moveUci, moves[index], 'transition dual write keeps rollback possible');
  }
  const positionId = stored[0].positionId;
  // Deliberately poison the old field to prove every reader uses the code.
  await prisma.importedGamePly.updateMany({ where: { importedGameId: game.id }, data: { moveUci: 'e2e4' } });
  assertUciPlies((await findImportedGameById(userId, game.id)).plies, moves);
  assert.equal(await findImportedGameById(userId + 1, game.id), null, 'ownership stays at the repository boundary');
  assertUciPlies((await getImportedGameForTagging(userId, game.id)).plies, moves);
  assertUciPlies((await findImportedGamesForOpeningStruggles(userId, {}, 20))[0].plies, moves);
  assertUciPlies(await getCourseReviewPlies([game.id]), moves);
  assertUciPlies(await findGamePliesThrough(userId, game.id, 10), moves);
  assertUciPlies(await getImportedGamePliesForBatchAnalysis(userId, game.id), moves);
  assertUciPlies(await getImportedGamePliesForAnalysisSummary(userId, game.id), moves);
  assertUciPlies((await createRunningGameAnalysisRun({ importedGameId: game.id, positionsTotal: moves.length })).importedGame.plies, moves);
  assertUciPlies((await getLatestGameAnalysisForImportedGame(userId, game.id)).importedGame.plies, moves);
  assertUciPlies((await getLatestGameAnalysisRunDeterministic(userId, game.id)).importedGame.plies, moves);
  const next = await findOpeningNextMoves(userId, {}, positionId);
  assertUciPlies(next.occurrences, ['a7a8b', 'a7a8n', 'a7a8q', 'a7a8q', 'a7a8r', 'h1g1']);
  assertUciPlies(next.distinctGames, ['a7a8b', 'a7a8n', 'a7a8q', 'a7a8r', 'h1g1']);
  assertUciPlies((await findOpeningTopGames(userId, {}, positionId, 10))[0].plies, ['a7a8q']);
  const candidates = await findCourseExtensionCandidatePlies(userId, [positionId], {});
  assertUciPlies(candidates, ['a7a8b', 'a7a8n', 'a7a8q', 'a7a8r', 'h1g1']);
  assert.equal(candidates.find((ply) => ply.moveUci === 'a7a8q').plyNumber, 1, 'distinct keeps the earliest occurrence');
  assert.deepEqual(await findCourseExtensionCandidatePlies(userId + 1, [positionId], {}), []);

  for (const [piece, san] of [['n', 'N'], ['b', 'B'], ['r', 'R'], ['q', 'Q']]) {
    const promotionGame = await prisma.importedGame.create({ data: {
      userId, accountId: account.id, provider: 'LICHESS', providerGameId: `promotion-${piece}-${suffix}`,
      pgn: `[SetUp "1"]\n[FEN "${normalizedFen} 0 1"]\n\n1. a8=${san} *`,
    } });
    const result = await ImportedGamePlyIndexService.indexOne(userId, promotionGame.id);
    assert.equal(result.status, 'INDEXED', result.error);
    const ply = await prisma.importedGamePly.findFirst({ where: { importedGameId: promotionGame.id } });
    assert.equal(ply.moveCode, encodeUciMove(`a7a8${piece}`));
    assertUciPlies((await findImportedGameById(userId, promotionGame.id)).plies, [`a7a8${piece}`]);
  }

  // Exercise the SQL engine-reply equality and missed-shot precedence with promotions.
  const tacticalGame = await prisma.importedGame.create({ data: {
    userId, accountId: account.id, provider: 'LICHESS', providerGameId: `tactical-${suffix}`, userColor: 'WHITE',
  } });
  const evals = [0, 0, 300, 0];
  for (const [index, score] of evals.entries()) {
    const testFen = `ply-code-test-${suffix}-${index}`;
    const position = await prisma.position.create({ data: { normalizedFen: testFen, positionKey: new Uint8Array(positionKeyForNormalizedFen(testFen)) } });
    positionIds.push(position.id);
    await prisma.positionAnalysis.create({ data: { positionId: position.id, bestScoreCpWhite: score, bestMoveUci: index === 2 ? 'A7A8Q' : 'e2e4' } });
    await prisma.importedGamePly.create({ data: {
      importedGameId: tacticalGame.id, plyNumber: index + 1, positionId: position.id,
      moveUci: 'e2e4', moveCode: encodeUciMove(index === 2 ? 'a7a8q' : 'e2e4'),
    } });
  }
  let tactical = await findTacticalDetectionCandidatesForGames(prisma, userId, [tacticalGame.id], tacticalDetectionThresholds);
  assert.equal(tactical.some((row) => row.kind === 'MISSED_SHOT'), false, 'equal engine reply excludes a missed shot, case insensitively');
  assert.ok(tactical.some((row) => row.kind === 'USER_BLUNDER' && row.triggerPlyNumber === 3));
  await prisma.importedGamePly.update({ where: { importedGameId_plyNumber: { importedGameId: tacticalGame.id, plyNumber: 3 } }, data: { moveCode: encodeUciMove('a7a8n') } });
  tactical = await findTacticalDetectionCandidatesForGames(prisma, userId, [tacticalGame.id], tacticalDetectionThresholds);
  assertUciPlies(tactical.filter((row) => row.kind === 'MISSED_SHOT'), ['a7a8n']);
  assert.equal(tactical.some((row) => row.kind === 'USER_BLUNDER' && row.triggerPlyNumber === 3), false, 'missed-shot precedence is preserved');
  const largeScope = [...Array.from({ length: 100 }, (_, i) => 2_000_000_000 + i), tacticalGame.id, tacticalGame.id];
  assert.deepEqual(await findTacticalDetectionCandidatesForGames(prisma, userId, largeScope, tacticalDetectionThresholds), tactical,
    'large scopes preserve candidates across batches and repeated game IDs do not duplicate detections');
  console.log('Compact ply storage, promotion indexing, repository boundaries, ordering/distinct, and tactical comparison tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.position.deleteMany({ where: { id: { in: positionIds } } });
  await prisma.$disconnect();
}
