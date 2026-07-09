import { Chess } from 'chess.js';
import {
  currentTacticalDetectionThresholdsHash,
  currentTacticalDetectionVersion,
} from '../lab/tactical-detections/tactical-detection.service';
import { evaluateScenarioAttempt } from './scenario-training-evaluation';
import {
  ScenarioTrainingAttemptInput,
  ScenarioTrainingDislikeInput,
  TacticalScenarioStartInput,
} from './scenario-training.schema';
import {
  completeScenarioTrainingSession,
  createScenarioTrainingAttempt,
  createScenarioTrainingSession,
  findGamePliesThrough,
  findScenarioTrainingSession,
  findScenarioTrainingSessionForDislike,
  findTacticalScenarioDetection,
  listScenarioTrainingHistory,
  ScenarioContextPly,
  TacticalDetectionKind,
  TacticalScenarioDetection,
  TacticalScenarioType,
  upsertTacticalDetectionFeedback,
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

function scoreToCp(
  scoreCp: number | null | undefined,
  mate: number | null | undefined,
): number | null {
  if (typeof scoreCp === 'number') return scoreCp;
  if (typeof mate !== 'number') return null;
  if (mate === 0) return 0;
  return mate > 0 ? MATE_AS_CP : -MATE_AS_CP;
}

function whiteToUserCp(scoreCpWhite: number | null, userColor: string): number | null {
  if (scoreCpWhite === null) return null;
  return userColor === 'BLACK' ? -scoreCpWhite : scoreCpWhite;
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

async function buildContextPlies(
  userId: number,
  detection: TacticalScenarioDetection,
  throughPlyNumber: number,
) {
  const rows = await findGamePliesThrough(userId, detection.importedGameId, throughPlyNumber);
  const rowByPly = new Map(rows.map((row) => [row.plyNumber, row]));
  const context: ScenarioContextPly[] = [];

  for (const row of rows.filter((ply) => ply.plyNumber <= throughPlyNumber)) {
    const fenBefore = toFullFen(row.position.normalizedFen, row.plyNumber);
    const nextRow = rowByPly.get(row.plyNumber + 1);
    const applied = applyMove(fenBefore, row.moveUci);
    const fenAfter = nextRow
      ? toFullFen(nextRow.position.normalizedFen, row.plyNumber + 1)
      : (applied?.fenAfter ?? fenBefore);
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

  return { context, rowByPly };
}

interface TacticalScenarioDefinition {
  scenarioType: TacticalScenarioType;
  detectionKind: TacticalDetectionKind;
  notFoundMessage: string;
}

const MISSED_SHOT_SCENARIO: TacticalScenarioDefinition = {
  scenarioType: 'MISSED_OPPORTUNITY',
  detectionKind: 'MISSED_SHOT',
  notFoundMessage: 'Tactical missed-shot scenario not found',
};

const BLUNDER_SCENARIO: TacticalScenarioDefinition = {
  scenarioType: 'BLUNDER_AVOIDANCE',
  detectionKind: 'USER_BLUNDER',
  notFoundMessage: 'Tactical blunder scenario not found',
};

async function startTacticalScenario(
  userId: number,
  input: TacticalScenarioStartInput,
  definition: TacticalScenarioDefinition,
) {
  const scope = {
    thresholdsHash: currentTacticalDetectionThresholdsHash(),
    detectionVersion: currentTacticalDetectionVersion(),
  };
  const finderOptions = {
    detectionKind: definition.detectionKind,
    scenarioType: definition.scenarioType,
  };
  let detection = await findTacticalScenarioDetection(userId, input, scope, finderOptions);
  if (!detection && input.excludeDetectionId && !input.detectionId) {
    detection = await findTacticalScenarioDetection(
      userId,
      { ...input, excludeDetectionId: undefined },
      scope,
      finderOptions,
    );
  }
  if (!detection && input.excludePassedRecently) {
    detection = await findTacticalScenarioDetection(
      userId,
      {
        ...input,
        excludeDetectionId: undefined,
        excludePassedRecently: false,
      },
      scope,
      finderOptions,
    );
  }
  if (!detection) throw new Error(definition.notFoundMessage);
  if (
    detection.importedGame.userColor !== 'WHITE' &&
    detection.importedGame.userColor !== 'BLACK'
  ) {
    throw new Error('Imported game has no trainable user color');
  }

  const isBlunderAvoidance = definition.scenarioType === 'BLUNDER_AVOIDANCE';
  const throughPlyNumber = isBlunderAvoidance
    ? detection.triggerPlyNumber - 1
    : detection.triggerPlyNumber;
  const { context, rowByPly } = await buildContextPlies(userId, detection, throughPlyNumber);
  const setupPly = context.at(-1);
  const challengeRow = isBlunderAvoidance ? rowByPly.get(detection.triggerPlyNumber) : null;
  const startFen = isBlunderAvoidance
    ? challengeRow && toFullFen(challengeRow.position.normalizedFen, detection.triggerPlyNumber)
    : setupPly?.fenAfter;
  if (!startFen) throw new Error('Scenario has no challenge position');
  const originalReply = detection.userReplyPlyNumber
    ? rowByPly.get(detection.userReplyPlyNumber)
    : null;
  const originalUserMoveUci = isBlunderAvoidance
    ? detection.moveUci
    : (originalReply?.moveUci ?? null);
  const originalUserMoveSan = originalUserMoveUci
    ? (applyMove(startFen, originalUserMoveUci)?.san ?? null)
    : null;

  const session = await createScenarioTrainingSession({
    userId,
    scenarioType: definition.scenarioType,
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
    previousFen: setupPly?.fenBefore ?? startFen,
    startFen,
    challengePlyNumber: isBlunderAvoidance
      ? detection.triggerPlyNumber
      : (detection.userReplyPlyNumber ?? detection.triggerPlyNumber + 1),
    triggerMoveUci: setupPly?.moveUci ?? null,
    triggerMoveSan: setupPly?.moveSan ?? null,
    originalUserMoveUci,
    originalUserMoveSan,
    referenceBestMoveUci: detection.bestMoveUci,
    contextPlies: context,
    baselineUserEvalCp: isBlunderAvoidance
      ? detection.evalBeforeUserCp
      : detection.evalAfterTriggerUserCp,
    passToleranceCp: PASS_TOLERANCE_CP,
  });

  return serializeSession(session)!;
}

export async function startTacticalMissedShotScenario(
  userId: number,
  input: TacticalScenarioStartInput,
) {
  return startTacticalScenario(userId, input, MISSED_SHOT_SCENARIO);
}

export async function startTacticalBlunderScenario(
  userId: number,
  input: TacticalScenarioStartInput,
) {
  return startTacticalScenario(userId, input, BLUNDER_SCENARIO);
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
  const evaluation = evaluateScenarioAttempt({
    moveUci: input.moveUci,
    referenceBestMoveUci: session.referenceBestMoveUci,
    originalUserMoveUci: session.originalUserMoveUci,
    sessionBaselineUserEvalCp: session.baselineUserEvalCp,
    submittedBaselineUserEvalCp: submittedBaselineUserCp,
    afterUserEvalCp,
    passToleranceCp: session.passToleranceCp,
  });

  await createScenarioTrainingAttempt({
    sessionId,
    attemptNumber: session.attempts.length + 1,
    fenBefore: session.startFen,
    playedMoveUci: input.moveUci,
    playedMoveSan: move.san,
    fenAfter: chess.fen(),
    baselineUserEvalCp: evaluation.baselineUserEvalCp,
    afterUserEvalCp,
    deltaCp: evaluation.deltaCp,
    passed: evaluation.passed,
    engineSource: input.engineSource,
    engineName: input.engineName ?? null,
    engineDepth: input.engineDepth,
    engineMultipv: input.engineMultipv,
    rawEngineJson: input.rawEngineJson,
  });

  return {
    passed: evaluation.passed,
    baselineUserEvalCp: evaluation.baselineUserEvalCp,
    afterUserEvalCp,
    deltaCp: evaluation.deltaCp,
    session: serializeSession(await findScenarioTrainingSession(userId, sessionId))!,
  };
}

export async function completeScenarioTraining(userId: number, sessionId: number) {
  const result = await completeScenarioTrainingSession(userId, sessionId);
  if (result.count === 0) throw new Error('Scenario training session not found');
  return serializeSession(await findScenarioTrainingSession(userId, sessionId));
}

export async function dislikeScenarioTrainingSource(
  userId: number,
  sessionId: number,
  input: ScenarioTrainingDislikeInput,
) {
  const session = await findScenarioTrainingSessionForDislike(userId, sessionId);
  if (!session) throw new Error('Scenario training session not found');
  if (session.attempts.length === 0)
    throw new Error('Cannot dislike a scenario before making an attempt');
  if (!session.importedGameId) throw new Error('Scenario training session has no source game');
  if (!session.tacticalDetection)
    throw new Error('Scenario training session has no tactical detection');

  await upsertTacticalDetectionFeedback({
    userId,
    importedGameId: session.importedGameId,
    kind: session.tacticalDetection.kind,
    triggerPlyNumber: session.tacticalDetection.triggerPlyNumber,
    status: 'DISLIKED',
    reason: input.reason ?? null,
    sourceSessionId: session.id,
  });

  return { disliked: true };
}

export async function getScenarioTrainingHistory(userId: number) {
  const sessions = await listScenarioTrainingHistory(userId);
  return { items: sessions.map((session) => serializeSession(session)!) };
}
