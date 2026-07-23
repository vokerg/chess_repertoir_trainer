import { createHash } from 'node:crypto';
import { tacticalDetectionThresholds } from './tactical-detection.constants';
import { getTacticalDetectionGameState } from './tactical-detection-game.repository.prisma';
import { TacticalDetectionListQuery, TacticalDetectionRunInput } from './tactical-detection.schema';
import { listFilteredTacticalDetections } from './tactical-detection-list.repository.prisma';
import {
  clearTacticalDetectionsForGames,
  countTacticalDetectionMatchingGames,
  createTacticalDetectionRun,
  findTacticalDetectionCandidatesForGames,
  findTacticalDetectionMatchingGameIds,
  insertTacticalDetections,
  markTacticalDetectionProcessedGames,
  markTacticalDetectionRunComplete,
  markTacticalDetectionRunFailed,
  runTacticalDetectionTransaction,
} from './tactical-detection.repository.prisma';

function defaultMonthRange(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

function normalizeRange(input: { from?: Date; to?: Date }) {
  const defaults = defaultMonthRange();
  return {
    from: input.from ?? defaults.from,
    to: input.to ?? defaults.to,
  };
}

export function currentTacticalDetectionThresholdsHash() {
  return createHash('sha256')
    .update(JSON.stringify(tacticalDetectionThresholds))
    .digest('hex')
    .slice(0, 24);
}

export function currentTacticalDetectionVersion() {
  return tacticalDetectionThresholds.detectionVersion;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown tactical detection error';
}

async function processTacticalDetectionGames(
  userId: number,
  runId: number,
  gameIds: number[],
  force: boolean,
  thresholdsHash: string,
) {
  const result = await runTacticalDetectionTransaction(async (db) => {
    if (force) await clearTacticalDetectionsForGames(db, userId, gameIds, {
      thresholdsHash,
      detectionVersion: currentTacticalDetectionVersion(),
    });
    const candidates = await findTacticalDetectionCandidatesForGames(
      db,
      userId,
      gameIds,
      tacticalDetectionThresholds,
    );
    const detectionsInserted = await insertTacticalDetections(db, runId, userId, candidates, {
      thresholdsHash,
      detectionVersion: currentTacticalDetectionVersion(),
    });
    const processedGames = await markTacticalDetectionProcessedGames(
      db,
      runId,
      userId,
      gameIds,
      thresholdsHash,
    );
    return { candidates, detectionsInserted, processedGames };
  });

  await markTacticalDetectionRunComplete(runId, {
    gamesScanned: gameIds.length,
    detectionsMade: result.detectionsInserted,
  });

  return {
    scannedGames: gameIds.length,
    processedGames: result.processedGames,
    detectionsInserted: result.detectionsInserted,
    missedShots: result.candidates.filter((candidate) => candidate.kind === 'MISSED_SHOT').length,
    punishedOpponentBlunders: result.candidates.filter(
      (candidate) => candidate.kind === 'PUNISHED_OPPONENT_BLUNDER',
    ).length,
    userBlunders: result.candidates.filter((candidate) => candidate.kind === 'USER_BLUNDER').length,
  };
}

export async function runTacticalDetection(userId: number, input: TacticalDetectionRunInput) {
  const range = normalizeRange(input);
  const force = input.force ?? false;
  const hash = currentTacticalDetectionThresholdsHash();
  const toExclusive = new Date(range.to);
  toExclusive.setDate(toExclusive.getDate() + 1);
  const run = await createTacticalDetectionRun(userId, {
    from: range.from,
    to: range.to,
    force,
    thresholds: tacticalDetectionThresholds,
    thresholdsHash: hash,
  });

  try {
    const totalMatchingGames = await countTacticalDetectionMatchingGames(userId, { ...range, toExclusive });
    const gameIds = await findTacticalDetectionMatchingGameIds(userId, {
      ...range,
      toExclusive,
      thresholdsHash: hash,
      force,
    });
    const result = await processTacticalDetectionGames(userId, run.id, gameIds, force, hash);

    return {
      runId: run.id,
      ...result,
      skippedAlreadyProcessedGames: force ? 0 : Math.max(totalMatchingGames - gameIds.length, 0),
    };
  } catch (error) {
    await markTacticalDetectionRunFailed(run.id, errorMessage(error));
    throw error;
  }
}

export async function refreshTacticalDetectionsForGame(
  userId: number,
  importedGameId: number,
  input: { force: boolean },
) {
  const hash = currentTacticalDetectionThresholdsHash();
  const game = await getTacticalDetectionGameState(userId, importedGameId, hash);

  if (
    !game
    || game.latestAnalysisStatus !== 'COMPLETED'
    || game.plyIndexedAt === null
    || game._count.plies === 0
    || (!input.force && game.tacticalDetectionProcessedGames.length > 0)
  ) {
    return {
      status: 'SKIPPED' as const,
      runId: null,
      scannedGames: 0,
      processedGames: 0,
      detectionsInserted: 0,
      missedShots: 0,
      punishedOpponentBlunders: 0,
      userBlunders: 0,
    };
  }

  const runDate = game.endedAt ?? game.latestAnalysisCompletedAt ?? new Date();
  const run = await createTacticalDetectionRun(userId, {
    from: runDate,
    to: runDate,
    force: input.force,
    thresholds: tacticalDetectionThresholds,
    thresholdsHash: hash,
  });

  try {
    const result = await processTacticalDetectionGames(
      userId,
      run.id,
      [importedGameId],
      input.force,
      hash,
    );
    return {
      status: 'COMPLETED' as const,
      runId: run.id,
      ...result,
    };
  } catch (error) {
    await markTacticalDetectionRunFailed(run.id, errorMessage(error));
    throw error;
  }
}

export async function getTacticalDetections(userId: number, query: TacticalDetectionListQuery) {
  const range = query.gameId
    ? { from: query.from, to: query.to }
    : normalizeRange(query);
  const items = await listFilteredTacticalDetections(userId, {
    ...query,
    from: range.from,
    to: range.to,
    thresholdsHash: currentTacticalDetectionThresholdsHash(),
    detectionVersion: currentTacticalDetectionVersion(),
  });
  return {
    from: range.from ?? null,
    to: range.to ?? null,
    limit: query.limit,
    kind: query.kind ?? null,
    items,
  };
}
