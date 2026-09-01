import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountGameDataLifecycleService } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.service.js';
import { createAccountGameDataLifecycleWorker } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.worker.service.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const auditKeyring = new LifecycleHmacKeyring([{ version: 1, secret: `test-audit-${suffix}` }]);
const service = createAccountGameDataLifecycleService({ auditKeyring });
const workerConfig = {
  pollIntervalMs: 1,
  heartbeatIntervalMs: 1_000,
  staleAfterMs: 5_000,
  staleRecoveryIntervalMs: 5_000,
  shutdownTimeoutMs: 5_000,
  gameBatchLimit: 25,
};
const silentLogger = { info() {}, warn() {}, error() {} };
const operationIds = [];
let userId;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function newWorker() {
  return createAccountGameDataLifecycleWorker({
    config: workerConfig,
    auditKeyring,
    logger: silentLogger,
  });
}

async function previewAndExecute(userIdValue, request, keySuffix) {
  const preview = await service.preview(userIdValue, request);
  operationIds.push(preview.operationId);
  const credentials = {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `onb-020-${keySuffix}-${suffix}`,
  };
  const execution = await service.execute(userIdValue, preview.operationId, credentials);
  assert.equal(execution.status, 'FENCING');
  return { preview, credentials };
}

async function settleCompleted(userIdValue, operationId, worker = newWorker(), maxSteps = 80) {
  for (let step = 0; step < maxSteps; step += 1) {
    const operation = await service.get(userIdValue, operationId);
    if (operation.status === 'COMPLETED') return operation;
    if (['NEEDS_ATTENTION', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(operation.status)) {
      assert.fail(`Lifecycle operation ${operationId} settled unexpectedly as ${operation.status}: ${operation.errorCode}`);
    }
    const didWork = await worker.runOnce();
    assert.equal(didWork, true, `expected lifecycle work while ${operation.status}`);
  }
  assert.fail(`Lifecycle operation ${operationId} did not complete within ${maxSteps} steps`);
}

async function driveToStatus(userIdValue, operationId, expectedStatus, worker = newWorker(), maxSteps = 20) {
  for (let step = 0; step < maxSteps; step += 1) {
    const operation = await service.get(userIdValue, operationId);
    if (operation.status === expectedStatus) return operation;
    await worker.runOnce();
  }
  const operation = await service.get(userIdValue, operationId);
  assert.equal(operation.status, expectedStatus);
  return operation;
}

async function createIndexedGame({ accountId, providerGameId, openingProvenance, openingName, openingEco }) {
  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(hash(`position:${providerGameId}`).slice(0, 32), 'hex'),
      normalizedFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      analysis: {
        create: {
          bestMoveUci: 'a1a2',
          bestScoreCpWhite: 25,
          lines: [{ pvUci: ['a1a2'] }],
        },
      },
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'LICHESS',
      providerGameId,
      pgn: '1. e4 e5',
      status: 'COMPLETED',
      result: '1-0',
      resultForUser: 'WIN',
      userColor: 'WHITE',
      whiteRating: 1800,
      blackRating: 1750,
      speedCategory: 'blitz',
      openingName,
      openingEco,
      openingProvenance,
      plyIndexedAt: new Date(),
      tagCodes: [9999],
    },
  });
  await prisma.importedGamePly.create({
    data: {
      importedGameId: game.id,
      positionId: position.id,
      plyNumber: 1,
      moveUci: 'e2e4',
      scoreLossCp: 80,
      classificationCode: 4,
    },
  });
  return { game, position };
}

async function addAnalysisEvidence(game) {
  const run = await prisma.gameAnalysisRun.create({
    data: {
      importedGameId: game.id,
      status: 'COMPLETED',
      positionsTotal: 1,
      positionsDone: 1,
      summary: { source: 'onb-020-test' },
      whiteAccuracy: 91,
      blackAccuracy: 87,
      completedAt: new Date(),
    },
  });
  await prisma.importedGame.update({
    where: { id: game.id },
    data: {
      latestAnalysisRunId: run.id,
      latestAnalysisStatus: 'COMPLETED',
      latestAnalysisCreatedAt: run.createdAt,
      latestAnalysisCompletedAt: run.completedAt,
      latestWhiteAccuracy: 91,
      latestBlackAccuracy: 87,
    },
  });
  await prisma.importedGameAiReview.create({
    data: {
      userId,
      importedGameId: game.id,
      analysisRunId: run.id,
      inputHash: hash(`review:${game.id}`),
      provider: 'TEST',
      model: 'test-model',
      content: { summary: 'test review' },
      generatedAt: new Date(),
    },
  });
  const thresholdsHash = hash(`thresholds:${game.id}`);
  const detectionRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId,
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash,
    },
  });
  const detection = await prisma.tacticalDetection.create({
    data: {
      runId: detectionRun.id,
      userId,
      importedGameId: game.id,
      kind: 'MISSED_SHOT',
      thresholdsHash,
      triggerPlyNumber: 1,
      moveUci: 'e2e4',
    },
  });
  await prisma.tacticalDetectionProcessedGame.create({
    data: {
      userId,
      importedGameId: game.id,
      thresholdsHash,
      runId: detectionRun.id,
    },
  });
  const feedback = await prisma.tacticalDetectionFeedback.create({
    data: {
      userId,
      importedGameId: game.id,
      kind: 'MISSED_SHOT',
      triggerPlyNumber: 1,
      status: 'DISLIKED',
      reason: 'Retain across un-analysis.',
    },
  });
  const scenario = await prisma.scenarioTrainingSession.create({
    data: {
      userId,
      scenarioType: 'MISSED_OPPORTUNITY',
      sourceType: 'TACTICAL_DETECTION',
      sourceId: detection.id,
      tacticalDetectionId: detection.id,
      importedGameId: game.id,
      userColor: 'WHITE',
      startFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      challengePlyNumber: 1,
      contextPlies: [],
    },
  });
  return { run, detectionRun, detection, feedback, scenario };
}

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-020 account/game integration',
      authProvider: 'onb-020-integration',
      authSubject: suffix,
    },
  });
  userId = user.id;

  // UNANALYSE keeps shared engine evidence, feedback, and the copied scenario while
  // removing all per-game analysis/tactical evidence and recomputing tags.
  const gameAccount = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `games-${suffix}` },
  });
  const local = await createIndexedGame({
    accountId: gameAccount.id,
    providerGameId: `local-${suffix}`,
    openingProvenance: 'LOCAL_BOOK',
    openingName: 'Local Opening',
    openingEco: 'A00',
  });
  const provider = await createIndexedGame({
    accountId: gameAccount.id,
    providerGameId: `provider-${suffix}`,
    openingProvenance: 'PROVIDER',
    openingName: 'Provider Opening',
    openingEco: 'B00',
  });
  const evidence = await addAnalysisEvidence(local.game);

  const unanalyse = await previewAndExecute(userId, {
    action: 'UNANALYSE_GAMES',
    accountId: gameAccount.id,
    gameIds: [local.game.id],
  }, 'unanalyse');
  await settleCompleted(userId, unanalyse.preview.operationId);

  assert.equal(await prisma.gameAnalysisRun.count({ where: { importedGameId: local.game.id } }), 0);
  assert.equal(await prisma.importedGameAiReview.count({ where: { importedGameId: local.game.id } }), 0);
  assert.equal(await prisma.tacticalDetection.count({ where: { importedGameId: local.game.id } }), 0);
  assert.equal(await prisma.tacticalDetectionProcessedGame.count({ where: { importedGameId: local.game.id } }), 0);
  const retainedPly = await prisma.importedGamePly.findUniqueOrThrow({
    where: { importedGameId_plyNumber: { importedGameId: local.game.id, plyNumber: 1 } },
  });
  assert.equal(retainedPly.scoreLossCp, null);
  assert.equal(retainedPly.classificationCode, null);
  assert.equal(await prisma.positionAnalysis.count({ where: { positionId: local.position.id } }), 1);
  assert.equal(await prisma.tacticalDetectionFeedback.count({ where: { id: evidence.feedback.id } }), 1);
  const retainedScenario = await prisma.scenarioTrainingSession.findUniqueOrThrow({
    where: { id: evidence.scenario.id },
  });
  assert.equal(retainedScenario.importedGameId, local.game.id);
  assert.equal(retainedScenario.tacticalDetectionId, null);
  assert.equal(retainedScenario.sourceId, evidence.detection.id);
  const unanalysedGame = await prisma.importedGame.findUniqueOrThrow({ where: { id: local.game.id } });
  assert.equal(unanalysedGame.tagCodes.includes(9999), false);
  assert.equal(unanalysedGame.openingProvenance, 'LOCAL_BOOK');
  assert.equal(unanalysedGame.openingName, 'Local Opening');

  // UNINDEX always includes un-analysis, deletes only per-game index rows, and clears
  // local opening attribution without touching provider opening metadata or shared positions.
  const unindex = await previewAndExecute(userId, {
    action: 'UNINDEX_GAMES',
    accountId: gameAccount.id,
    gameIds: [local.game.id, provider.game.id],
  }, 'unindex');
  await settleCompleted(userId, unindex.preview.operationId);
  assert.equal(
    await prisma.importedGamePly.count({ where: { importedGameId: { in: [local.game.id, provider.game.id] } } }),
    0,
  );
  assert.equal(await prisma.positionAnalysis.count({ where: { positionId: local.position.id } }), 1);
  assert.equal(await prisma.positionAnalysis.count({ where: { positionId: provider.position.id } }), 1);
  const [localAfterUnindex, providerAfterUnindex] = await Promise.all([
    prisma.importedGame.findUniqueOrThrow({ where: { id: local.game.id } }),
    prisma.importedGame.findUniqueOrThrow({ where: { id: provider.game.id } }),
  ]);
  assert.equal(localAfterUnindex.openingProvenance, 'NONE');
  assert.equal(localAfterUnindex.openingName, null);
  assert.equal(localAfterUnindex.openingEco, null);
  assert.equal(providerAfterUnindex.openingProvenance, 'PROVIDER');
  assert.equal(providerAfterUnindex.openingName, 'Provider Opening');
  assert.equal(providerAfterUnindex.openingEco, 'B00');
  assert.equal(await prisma.scenarioTrainingSession.count({ where: { id: evidence.scenario.id } }), 1);

  // A preview is stale when its affected-row matrix changes before execution.
  const staleGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId: gameAccount.id,
      provider: 'LICHESS',
      providerGameId: `stale-${suffix}`,
      pgn: '1. d4 d5',
    },
  });
  const stalePreview = await service.preview(userId, {
    action: 'UNANALYSE_GAMES',
    accountId: gameAccount.id,
    gameIds: [staleGame.id],
  });
  operationIds.push(stalePreview.operationId);
  await prisma.gameAnalysisRun.create({
    data: { importedGameId: staleGame.id, status: 'COMPLETED', positionsTotal: 0, positionsDone: 0 },
  });
  await assert.rejects(
    service.execute(userId, stalePreview.operationId, {
      previewToken: stalePreview.previewToken,
      confirmationPhrase: stalePreview.confirmationPhrase,
      idempotencyKey: `onb-020-stale-${suffix}`,
    }),
    (error) => error?.code === 'DATA_LIFECYCLE_PREVIEW_INVALID',
  );
  assert.equal((await service.get(userId, stalePreview.operationId)).status, 'PREVIEWED');

  // PURGE uses bounded forward-only batches. Stop after the first committed batch,
  // verify the durable checkpoint/fence, then recreate the worker and resume to completion.
  const purgeAccount = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `purge-${suffix}`,
      lastSyncAt: new Date(),
      syncCursorTime: new Date(),
      lastSyncRunId: 123,
    },
  });
  await prisma.importedGame.createMany({
    data: Array.from({ length: 101 }, (_, index) => ({
      userId,
      accountId: purgeAccount.id,
      provider: 'LICHESS',
      providerGameId: `purge-${index}-${suffix}`,
      pgn: '1. e4 e5',
    })),
  });
  const purgeGames = await prisma.importedGame.findMany({
    where: { accountId: purgeAccount.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const purgeThresholds = hash(`purge-thresholds-${suffix}`);
  const purgeDetectionRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId,
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash: purgeThresholds,
    },
  });
  const purgeDetection = await prisma.tacticalDetection.create({
    data: {
      runId: purgeDetectionRun.id,
      userId,
      importedGameId: purgeGames[0].id,
      kind: 'MISSED_SHOT',
      thresholdsHash: purgeThresholds,
      triggerPlyNumber: 1,
      moveUci: 'e2e4',
    },
  });
  const purgeScenario = await prisma.scenarioTrainingSession.create({
    data: {
      userId,
      scenarioType: 'MISSED_OPPORTUNITY',
      sourceType: 'TACTICAL_DETECTION',
      sourceId: purgeDetection.id,
      tacticalDetectionId: purgeDetection.id,
      importedGameId: purgeGames[0].id,
      userColor: 'WHITE',
      startFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      challengePlyNumber: 1,
      contextPlies: [],
    },
  });
  const terminalImport = await prisma.importRun.create({
    data: {
      userId,
      accountId: purgeAccount.id,
      provider: 'LICHESS',
      mode: 'HISTORICAL_BACKFILL',
      source: 'ACCOUNT_REFRESH',
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });
  await prisma.accountImportCoverage.create({
    data: {
      accountId: purgeAccount.id,
      scopeVersion: 1,
      scopeHash: hash(`purge-scope-${suffix}`),
      scopeJson: { variant: 'STANDARD' },
      coveredFrom: new Date('2026-01-01T00:00:00.000Z'),
      coveredThrough: new Date('2026-08-01T00:00:00.000Z'),
      lastCompletedImportRunId: terminalImport.id,
    },
  });
  await prisma.accountRatingStats.create({
    data: { accountId: purgeAccount.id, gamesCount: 101, data: { test: true } },
  });
  const oauth = await prisma.lichessConnection.create({
    data: {
      userId,
      externalAccountId: purgeAccount.id,
      lichessUserId: `lichess-${suffix}`,
      username: `oauth-${suffix}`,
      scopes: ['email:read'],
      accessTokenCiphertext: 'ciphertext',
      accessTokenIv: 'iv',
      accessTokenAuthTag: 'tag',
    },
  });

  const purge = await previewAndExecute(userId, {
    action: 'PURGE_ACCOUNT_DATA',
    accountId: purgeAccount.id,
  }, 'purge');
  const purgeWorker = newWorker();
  await driveToStatus(userId, purge.preview.operationId, 'EXECUTING', purgeWorker);
  await purgeWorker.runOnce();
  assert.equal(
    await prisma.importedGame.count({ where: { accountId: purgeAccount.id } }),
    76,
    'configured 25-game destructive batch limit must be honored',
  );
  const afterFirstPurgeBatch = await service.get(userId, purge.preview.operationId);
  assert.equal(afterFirstPurgeBatch.checkpoint?.phase, 'PURGE_GAMES');
  assert.equal(afterFirstPurgeBatch.checkpoint?.afterGameId, purgeGames[24].id);
  assert.ok(afterFirstPurgeBatch.firstDestructiveCommitAt);
  assert.equal(await prisma.scenarioTrainingSession.count({ where: { id: purgeScenario.id } }), 0);

  const stop = await service.requestStop(userId, purge.preview.operationId);
  assert.equal(stop.stopRequest, 'STOP_AFTER_BATCH');
  await purgeWorker.runOnce();
  const attention = await service.get(userId, purge.preview.operationId);
  assert.equal(attention.status, 'NEEDS_ATTENTION');
  assert.equal(attention.terminalResult, 'NEEDS_ATTENTION');
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: purge.preview.operationId, releasedAt: null },
    }),
    1,
    'partial execution retains its fence',
  );

  const resumed = await service.execute(userId, purge.preview.operationId, purge.credentials);
  assert.equal(resumed.status, 'EXECUTING');
  assert.equal(resumed.stopRequest, 'NONE');
  const completedPurge = await settleCompleted(userId, purge.preview.operationId, newWorker());
  assert.equal(completedPurge.status, 'COMPLETED');
  assert.equal(await prisma.importedGame.count({ where: { accountId: purgeAccount.id } }), 0);
  assert.equal(await prisma.externalAccount.count({ where: { id: purgeAccount.id } }), 1);
  assert.equal(await prisma.importRun.count({ where: { id: terminalImport.id } }), 1);
  assert.equal(await prisma.accountImportCoverage.count({ where: { accountId: purgeAccount.id } }), 0);
  assert.equal(await prisma.accountRatingStats.count({ where: { accountId: purgeAccount.id } }), 0);
  const purgedAccount = await prisma.externalAccount.findUniqueOrThrow({ where: { id: purgeAccount.id } });
  assert.equal(purgedAccount.lastSyncAt, null);
  assert.equal(purgedAccount.syncCursorTime, null);
  assert.equal(purgedAccount.lastSyncRunId, null);
  const retainedOauth = await prisma.lichessConnection.findUniqueOrThrow({ where: { id: oauth.id } });
  assert.equal(retainedOauth.externalAccountId, purgeAccount.id);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: purge.preview.operationId, releasedAt: null },
    }),
    0,
  );

  // DELETE_EXTERNAL_ACCOUNT runs purge first, snapshots bounded audit data, clears the
  // default account pointer, and lets the account FK cascade remove retained import history.
  const deleteAccount = await prisma.externalAccount.create({
    data: { userId, provider: 'CHESS_COM', username: `delete-${suffix}` },
  });
  await prisma.appUser.update({
    where: { id: userId },
    data: { defaultProgressAccountId: deleteAccount.id },
  });
  const deleteGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId: deleteAccount.id,
      provider: 'CHESS_COM',
      providerGameId: `delete-game-${suffix}`,
      pgn: '1. c4 e5',
    },
  });
  const deleteThresholds = hash(`delete-thresholds-${suffix}`);
  const deleteDetectionRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId,
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash: deleteThresholds,
    },
  });
  const deleteDetection = await prisma.tacticalDetection.create({
    data: {
      runId: deleteDetectionRun.id,
      userId,
      importedGameId: deleteGame.id,
      kind: 'MISSED_SHOT',
      thresholdsHash: deleteThresholds,
      triggerPlyNumber: 1,
      moveUci: 'c2c4',
    },
  });
  const deleteScenario = await prisma.scenarioTrainingSession.create({
    data: {
      userId,
      scenarioType: 'MISSED_OPPORTUNITY',
      sourceType: 'TACTICAL_DETECTION',
      sourceId: deleteDetection.id,
      tacticalDetectionId: deleteDetection.id,
      importedGameId: deleteGame.id,
      userColor: 'WHITE',
      startFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      challengePlyNumber: 1,
      contextPlies: [],
    },
  });
  const deleteImport = await prisma.importRun.create({
    data: {
      userId,
      accountId: deleteAccount.id,
      provider: 'CHESS_COM',
      mode: 'HISTORICAL_BACKFILL',
      source: 'ACCOUNT_REFRESH',
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  const deletion = await previewAndExecute(userId, {
    action: 'DELETE_EXTERNAL_ACCOUNT',
    accountId: deleteAccount.id,
  }, 'delete');
  await settleCompleted(userId, deletion.preview.operationId);
  assert.equal(await prisma.externalAccount.count({ where: { id: deleteAccount.id } }), 0);
  assert.equal(await prisma.importedGame.count({ where: { id: deleteGame.id } }), 0);
  assert.equal(await prisma.importRun.count({ where: { id: deleteImport.id } }), 0);
  assert.equal(await prisma.scenarioTrainingSession.count({ where: { id: deleteScenario.id } }), 0);
  assert.equal(
    (await prisma.appUser.findUniqueOrThrow({ where: { id: userId } })).defaultProgressAccountId,
    null,
  );
  assert.equal(
    await prisma.dataLifecycleAuditEvent.count({
      where: {
        operationId: deletion.preview.operationId,
        eventType: 'ACCOUNT_DELETE_AGGREGATE_SNAPSHOT',
      },
    }),
    1,
  );

  console.log('Account/game destructive lifecycle worker integration tests passed.');
} finally {
  if (operationIds.length > 0) {
    await prisma.dataLifecycleResourceFence.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  }
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
