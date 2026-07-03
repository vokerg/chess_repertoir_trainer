import { createHash } from 'node:crypto';
import { tacticalDetectionThresholds } from './tactical-detection.constants';
import { TacticalDetectionListQuery, TacticalDetectionRunInput } from './tactical-detection.schema';
import {
  clearTacticalDetectionsForGames,
  countTacticalDetectionMatchingGames,
  createTacticalDetectionRun,
  findTacticalDetectionCandidatesForGames,
  findTacticalDetectionMatchingGameIds,
  insertTacticalDetections,
  listTacticalDetections,
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeRange(input: { from?: Date; to?: Date }) {
  const defaults = defaultMonthRange();
  const from = input.from ?? defaults.from;
  const to = input.to ?? defaults.to;
  return {
    from,
    to,
    toExclusive: addDays(to, 1),
  };
}

function thresholdsHash() {
  return createHash('sha256')
    .update(JSON.stringify(tacticalDetectionThresholds))
    .digest('hex')
    .slice(0, 24);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown tactical detection error';
}

export async function runTacticalDetection(userId: number, input: TacticalDetectionRunInput) {
  const range = normalizeRange(input);
  const force = input.force ?? false;
  const hash = thresholdsHash();
  const run = await createTacticalDetectionRun(userId, {
    from: range.from,
    to: range.to,
    force,
    thresholds: tacticalDetectionThresholds,
    thresholdsHash: hash,
  });

  try {
    const totalMatchingGames = await countTacticalDetectionMatchingGames(userId, range);
    const gameIds = await findTacticalDetectionMatchingGameIds(userId, {
      ...range,
      thresholdsHash: hash,
      force,
    });

    const result = await runTacticalDetectionTransaction(async (db) => {
      if (force) await clearTacticalDetectionsForGames(db, userId, gameIds, hash);
      const candidates = await findTacticalDetectionCandidatesForGames(db, userId, gameIds, tacticalDetectionThresholds);
      const detectionsInserted = await insertTacticalDetections(db, run.id, userId, candidates);
      const processedGames = await markTacticalDetectionProcessedGames(db, run.id, userId, gameIds, hash);
      return { candidates, detectionsInserted, processedGames };
    });

    await markTacticalDetectionRunComplete(run.id, {
      gamesScanned: gameIds.length,
      detectionsMade: result.detectionsInserted,
    });

    return {
      runId: run.id,
      scannedGames: gameIds.length,
      skippedAlreadyProcessedGames: force ? 0 : Math.max(totalMatchingGames - gameIds.length, 0),
      processedGames: result.processedGames,
      detectionsInserted: result.detectionsInserted,
      missedShots: result.candidates.filter((candidate) => candidate.kind === 'MISSED_SHOT').length,
      punishedOpponentBlunders: result.candidates.filter(
        (candidate) => candidate.kind === 'PUNISHED_OPPONENT_BLUNDER',
      ).length,
      userBlunders: result.candidates.filter((candidate) => candidate.kind === 'USER_BLUNDER').length,
    };
  } catch (error) {
    await markTacticalDetectionRunFailed(run.id, errorMessage(error));
    throw error;
  }
}

export async function getTacticalDetections(userId: number, query: TacticalDetectionListQuery) {
  const range = normalizeRange(query);
  const items = await listTacticalDetections(userId, {
    ...query,
    from: range.from,
    to: range.to,
    toExclusive: range.toExclusive,
  });
  return {
    from: range.from,
    to: range.to,
    limit: query.limit,
    kind: query.kind ?? null,
    items,
  };
}
