import { Chess } from 'chess.js';
import {
  currentTacticalDetectionThresholdsHash,
  currentTacticalDetectionVersion,
} from '../lab/tactical-detections/tactical-detection.service';
import { ScenarioTrainingAttemptInput, TacticalMissedShotStartInput } from './scenario-training.schema';
import {
  completeScenarioTrainingSession,
  createScenarioTrainingAttempt,
  createScenarioTrainingSession,
  findGamePliesThrough,
  findScenarioTrainingSession,
  findTacticalMissedShotDetection,
  listScenarioTrainingHistory,
  ScenarioContextPly,
  TacticalMissedShotDetection,
} from './scenario-training.repository.prisma';

const MATE_AS_CP = 100_000;
const PASS_TOLERANCE_CP = 100;

function parseUci(moveUci: string) {
  return {
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.slice(4, 5) || undefined,
  };
}

function toFullFen(fen: string, plyNumberBefore: number): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length >= 6) return new Chess(fen).fen();
  const fullmoveNumber = Math.max(1, Math.floor((plyNumberBefore + 1) / 2));
  return new Chess(`${parts.slice(0, 4).join(' ')} 0 ${fullmoveNumber}`).fen();
}

function moveNumber(plyNumber: number): number {
  return Math.ceil(plyNumber / 2);
}

function isUserMove(plyNumber: number, userColor: string): boolean {
  return userColor === 'WHITE' ? plyNumber % 2 === 1 : plyNumber % 2 === 0;
}

function applyMove(fen: string, moveUci: string) {
  const chess = new Chess(fen);
  const move = chess.move(parseUci(moveUci));
  if (!move) return null;
  return { san: move.san, fenAfter: chess.fen() };
}

function scoreToCp(scoreCp: number | null | undefined, mate: number | null | undefined): number | null {
  if (typeof scoreCp === 'number') return scoreCp;
  if (typeof mate !== 'number') return null;
  if (mate === 0) return 0;
  return mate > 0 ? MATE_AS_CP : -MATE_AS_CP;
}

function whiteToUserCp(scoreCpWhite: number | null, userColor: string): number | null {
  if (scoreCpWhite === null) return null;
  return userColor === 'BLACK' ? -scoreCpWhite : scoreCpWhite;
}

function sameUciMove(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function serializeSession(session: Awaited<ReturnType<typeof findScenarioTrainingSession>>) {
  if (!session) return null;
  return {
    id: session.id,
    sessionId: session.id,
    scenarioType: session.scenarioType,
    sourceType: session.sourceType,
    sourceId: session.sourceId,
    importedGameId: session.importedGameId,
    whiteUsername: session.whiteUsername,
    blackUsername: session.blackUsername,
    whiteRating: session.importedGame?.whiteRating ?? null,
    blackRating: session.importedGame?.blackRating ?? null,
    userColor: session.userColor,
    opponentUsername: session.opponentUsername,
    resultForUser: session.resultForUser,
    gameResult: session.gameResult,
    openingEco: session.openingEco,
    openingName: session.openingName,
    endedAt: session.endedAt?.toISOString() ?? null,
    providerUrl: session.providerUrl,
    previousFen: session.previousFen,
    startFen: session.startFen,
    challengePlyNumber: session.challengePlyNumber,
    triggerMoveUci: session.triggerMoveUci,
    triggerMoveSan: session.triggerMoveSan,
    originalUserMoveUci: session.originalUserMoveUci,
    originalUserMoveSan: session.originalUserMoveSan,
    referenceBestMoveUci: session.referenceBestMoveUci,
    contextPlies: session.contextPlies as unknown as ScenarioContextPly[],
    baselineUserEvalCp: session.baselineUserEvalCp,
    passToleranceCp: session.passToleranceCp,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    attempts: session.attempts.map((attempt) => ({
      ...attempt,
      createdAt: attempt.createdAt.toISOString(),
    })),
  };
}

async function buildContextPlies(userId: number, detection: TacticalMissedShotDetection) {
  const rows = await findGamePliesThrough(userId, detection.importedGameId, detection.triggerPlyNumber);
  const rowByPly = new Map(rows.map((row) => [row.plyNumber, row]));
  const context: ScenarioContextPly[] = [];

  for (const row of rows.filter((ply) => ply.plyNumber <= detection.triggerPlyNumber)) {
    const fenBefore = toFullFen(row.position.normalizedFen, row.plyNumber);
    const nextRow = rowByPly.get(row.plyNumber + 1);
    const applied = applyMove(fenBefore, row.moveUci);
    const fenAfter = nextRow
      ? toFullFen(nextRow.position.normalizedFen, row.plyNumber + 1)
      : applied?.fenAfter ?? fenBefore;
    context.push({
      plyNumber: row.plyNumber,
      moveNumber: moveNumber(row.plyNumber),
      moveUci: row.moveUci,
      moveSan: applied?.san ?? null,
      fenBefore,
      fenAfter,
      isUserMove: isUserMove(row.plyNumber, detection.importedGame.userColor ?? ''),
    });
  }

  const triggerContext = context.at(-1);
  if (!triggerContext) throw new Error('Scenario has no context plies');
  const originalReply = detection.userReplyPlyNumber ? rowByPly.get(detection.userReplyPlyNumber) : null;
  const originalReplyApplied = originalReply ? applyMove(triggerContext.fenAfter, originalReply.moveUci) : null;

  return {
    context,
    previousFen: triggerContext.fenBefore,
    startFen: triggerContext.fenAfter,
    triggerMoveUci: triggerContext.moveUci,
    triggerMoveSan: triggerContext.moveSan,
    originalUserMoveUci: originalReply?.moveUci ?? null,
    originalUserMoveSan: originalReplyApplied?.san ?? null,
  };
}

export async function startTacticalMissedShotScenario(userId: number, input: TacticalMissedShotStartInput) {
  const scope = {
    thresholdsHash: currentTacticalDetectionThresholdsHash(),
    detectionVersion: currentTacticalDetectionVersion(),
  };
  let detection = await findTacticalMissedShotDetection(userId, input, scope);
  if (!detection && input.excludeDetectionId && !input.detectionId) {
    detection = await findTacticalMissedShotDetection(userId, { ...input, excludeDetectionId: undefined }, scope);
  }
  if (!detection && input.excludePassedRecently) {
    detection = await findTacticalMissedShotDetection(userId, {
      ...input,
      excludeDetectionId: undefined,
      excludePassedRecently: false,
    }, scope);
  }
  if (!detection) throw new Error('Tactical missed-shot scenario not found');
  if (detection.importedGame.userColor !== 'WHITE' && detection.importedGame.userColor !== 'BLACK') {
    throw new Error('Imported game has no trainable user color');
  }

  const context = await buildContextPlies(userId, detection);
  const session = await createScenarioTrainingSession({
    userId,
    scenarioType: 'MISSED_OPPORTUNITY',
    sourceType: 'TACTICAL_DETECTION',
    sourceId: detection.id,
    tacticalDetectionId: detection.id,
    importedGameId: detection.importedGameId,
    userColor: detection.importedGame.userColor,
    opponentUsername: detection.importedGame.opponentUsername,
    whiteUsername: detection.importedGame.whiteUsername,
    blackUsername: detection.importedGame.blackUsername,
    resultForUser: detection.importedGame.resultForUser,
    gameResult: detection.importedGame.result,
    openingEco: detection.importedGame.openingEco,
    openingName: detection.importedGame.openingName,
    endedAt: detection.importedGame.endedAt,
    providerUrl: detection.importedGame.providerUrl,
    previousFen: context.previousFen,
    startFen: context.startFen,
    challengePlyNumber: detection.userReplyPlyNumber ?? detection.triggerPlyNumber + 1,
    triggerMoveUci: context.triggerMoveUci,
    triggerMoveSan: context.triggerMoveSan,
    originalUserMoveUci: context.originalUserMoveUci,
    originalUserMoveSan: context.originalUserMoveSan,
    referenceBestMoveUci: detection.bestMoveUci,
    contextPlies: context.context,
    baselineUserEvalCp: detection.evalAfterTriggerUserCp,
    passToleranceCp: PASS_TOLERANCE_CP,
  });

  return serializeSession(session)!;
}

export async function getScenarioTrainingSession(userId: number, sessionId: number) {
  return serializeSession(await findScenarioTrainingSession(userId, sessionId));
}

export async function submitScenarioTrainingAttempt(
  userId: number,
  sessionId: number,
  input: ScenarioTrainingAttemptInput,
) {
  const session = await findScenarioTrainingSession(userId, sessionId);
  if (!session) throw new Error('Scenario training session not found');
  if (session.status !== 'IN_PROGRESS') throw new Error('Scenario training session is not active');

  const chess = new Chess(session.startFen);
  const move = chess.move(parseUci(input.moveUci));
  if (!move) throw new Error('Move is not legal from the challenge position');
  if (chess.fen() !== new Chess(input.fenAfter).fen()) {
    throw new Error('fenAfter does not match applying moveUci to the challenge position');
  }

  const baselineWhiteCp = scoreToCp(input.baselineScoreCpWhite, input.baselineMateWhite);
  const afterWhiteCp = scoreToCp(input.afterScoreCpWhite, input.afterMateWhite);
  const submittedBaselineUserCp = whiteToUserCp(baselineWhiteCp, session.userColor);
  const afterUserEvalCp = whiteToUserCp(afterWhiteCp, session.userColor);
  const baselineUserEvalCp = submittedBaselineUserCp ?? session.baselineUserEvalCp;
  const deltaCp = baselineUserEvalCp !== null && afterUserEvalCp !== null
    ? baselineUserEvalCp - afterUserEvalCp
    : null;
  const passedByEval = baselineUserEvalCp !== null && afterUserEvalCp !== null
    ? afterUserEvalCp >= baselineUserEvalCp - session.passToleranceCp
    : false;
  const passed = sameUciMove(input.moveUci, session.referenceBestMoveUci) || passedByEval;

  await createScenarioTrainingAttempt({
    sessionId,
    attemptNumber: session.attempts.length + 1,
    fenBefore: session.startFen,
    playedMoveUci: input.moveUci,
    playedMoveSan: move.san,
    fenAfter: chess.fen(),
    baselineUserEvalCp,
    afterUserEvalCp,
    deltaCp,
    passed,
    engineSource: input.engineSource,
    engineName: input.engineName ?? null,
    engineDepth: input.engineDepth,
    engineMultipv: input.engineMultipv,
    rawEngineJson: input.rawEngineJson,
  });

  return {
    passed,
    baselineUserEvalCp,
    afterUserEvalCp,
    deltaCp,
    session: serializeSession(await findScenarioTrainingSession(userId, sessionId))!,
  };
}

export async function completeScenarioTraining(userId: number, sessionId: number) {
  const result = await completeScenarioTrainingSession(userId, sessionId);
  if (result.count === 0) throw new Error('Scenario training session not found');
  return serializeSession(await findScenarioTrainingSession(userId, sessionId));
}

export async function getScenarioTrainingHistory(userId: number) {
  const sessions = await listScenarioTrainingHistory(userId);
  return { items: sessions.map((session) => serializeSession(session)!) };
}
