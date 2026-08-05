import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  completeGameAnalysisRun,
  createRunningGameAnalysisRun,
} from '../../dist/modules/analysis/analysis.repository.prisma.js';
import { GameAnalysisService } from '../../dist/modules/analysis/game-analysis.service.js';
import {
  findOwnedLichessPuzzleRound,
  updateOwnedLichessPuzzleRound,
} from '../../dist/modules/lichess-puzzles/lichess-puzzles.repository.prisma.js';
import {
  completeScenarioTrainingSession,
} from '../../dist/modules/scenario-training/scenario-training.repository.prisma.js';
import {
  ChapterService,
  CourseService,
  LineService,
  MoveNodeService,
} from '../../dist/modules/courses/courses.service.js';
import { TrainingService } from '../../dist/services/trainingService.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId = null;
let puzzleId = null;

async function totalActivity(type) {
  const rows = await prisma.userActivityDailyAggregate.findMany({
    where: { userId, type },
  });
  return rows.reduce((total, row) => total + row.count, 0);
}

async function createImportedGame(accountId, name) {
  return prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'TEST',
      providerGameId: `${name}-${suffix}`,
      endedAt: new Date(),
    },
  });
}

const completionData = {
  positionsTotal: 0,
  positionsDone: 0,
  summary: {},
  accuracyVersion: 'test-v1',
  whiteAccuracy: null,
  blackAccuracy: null,
  whiteAverageCentipawnLoss: null,
  blackAverageCentipawnLoss: null,
  whiteMovesAnalyzed: 0,
  blackMovesAnalyzed: 0,
};

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Activity producer test',
      authProvider: 'test',
      authSubject: `activity-producers-${suffix}`,
      timeZone: 'Europe/Copenhagen',
    },
  });
  userId = user.id;

  const course = await CourseService.create(userId, { name: 'Producer course' });
  const chapter = await ChapterService.create(userId, course.id, { name: 'Producer chapter' });
  const line = await LineService.create(userId, chapter.id, {
    name: 'Producer line',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  await MoveNodeService.create(userId, line.id, { moveUci: 'e2e4' });
  const webSession = await TrainingService.start(userId, line.id);
  const [firstWebCompletion, repeatedWebCompletion] = await Promise.all([
    TrainingService.complete(userId, webSession.sessionId),
    TrainingService.complete(userId, webSession.sessionId),
  ]);
  assert.equal(firstWebCompletion.result, 'FAILED');
  assert.equal(repeatedWebCompletion.result, 'FAILED');
  assert.equal(await totalActivity('REPERTOIRE_LINES_TRAINED'), 1);

  const scenarioFen = '8/8/8/8/8/8/8/K6k w - - 0 1';
  const scenario = await prisma.scenarioTrainingSession.create({
    data: {
      userId,
      scenarioType: 'MISSED_OPPORTUNITY',
      sourceType: 'TEST',
      sourceId: 1,
      userColor: 'WHITE',
      startFen: scenarioFen,
      challengePlyNumber: 1,
      contextPlies: [],
    },
  });
  await prisma.scenarioTrainingAttempt.create({
    data: {
      sessionId: scenario.id,
      attemptNumber: 1,
      fenBefore: scenarioFen,
      playedMoveUci: 'a1a2',
      fenAfter: '8/8/8/8/8/8/K7/7k b - - 1 1',
      passed: false,
      engineSource: 'TEST',
      engineDepth: 1,
      engineMultipv: 1,
    },
  });
  const scenarioCompletions = await Promise.all([
    completeScenarioTrainingSession(userId, scenario.id),
    completeScenarioTrainingSession(userId, scenario.id),
  ]);
  assert.deepEqual(scenarioCompletions.map((result) => result.count), [1, 1]);
  assert.equal(await totalActivity('TACTICAL_SCENARIOS_COMPLETED'), 1);

  const emptyScenario = await prisma.scenarioTrainingSession.create({
    data: {
      userId,
      scenarioType: 'MISSED_OPPORTUNITY',
      sourceType: 'TEST',
      sourceId: 2,
      userColor: 'WHITE',
      startFen: scenarioFen,
      challengePlyNumber: 1,
      contextPlies: [],
    },
  });
  await completeScenarioTrainingSession(userId, emptyScenario.id);
  assert.equal(await totalActivity('TACTICAL_SCENARIOS_COMPLETED'), 1);

  puzzleId = suffix.replaceAll('-', '').slice(0, 16);
  await prisma.lichessPuzzle.create({
    data: {
      id: puzzleId,
      gameId: puzzleId,
      gamePgn: '',
      initialPly: 0,
      startFen: scenarioFen,
      lastMoveUci: 'a1a2',
      sideToMove: 'white',
      solutionUci: ['a1a2'],
      themes: [],
      rating: 1500,
      plays: 1,
    },
  });
  const puzzleRound = await prisma.lichessPuzzleRound.create({
    data: {
      userId,
      puzzleId,
      source: 'FRESH',
      angle: 'test',
      ratedRequested: false,
      currentFen: scenarioFen,
      moveAttempts: [],
    },
  });
  const puzzleSnapshot = await findOwnedLichessPuzzleRound(userId, puzzleRound.id);
  const puzzleCompletedAt = new Date();
  const completedPuzzle = await updateOwnedLichessPuzzleRound(puzzleSnapshot, {
    status: 'COMPLETED',
    outcome: 'WIN',
    currentStep: 1,
    completedAt: puzzleCompletedAt,
    learningCompletedAt: puzzleCompletedAt,
    moveAttempts: [],
  });
  await updateOwnedLichessPuzzleRound(completedPuzzle, {
    status: 'COMPLETED',
    completedAt: puzzleCompletedAt,
  });
  assert.equal(await totalActivity('LICHESS_PUZZLES_COMPLETED'), 1);

  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'TEST', username: `activity-${suffix}` },
  });
  const workerGame = await createImportedGame(account.id, 'worker');
  const running = await createRunningGameAnalysisRun({
    importedGameId: workerGame.id,
    positionsTotal: 0,
  });
  const [firstWorkerCompletion, repeatedWorkerCompletion] = await Promise.all([
    completeGameAnalysisRun(running.id, completionData),
    completeGameAnalysisRun(running.id, completionData),
  ]);
  assert.equal(firstWorkerCompletion.status, 'COMPLETED');
  assert.equal(repeatedWorkerCompletion.id, firstWorkerCompletion.id);
  assert.equal(await totalActivity('GAME_ANALYSES_COMPLETED'), 1);

  const clientGame = await createImportedGame(account.id, 'client');
  const clientCompletions = await Promise.all([
    GameAnalysisService.createClientAnalysisSummary(
      userId,
      clientGame.id,
      { positionsDone: 0, summary: {} },
    ),
    GameAnalysisService.createClientAnalysisSummary(
      userId,
      clientGame.id,
      { positionsDone: 0, summary: {} },
    ),
  ]);
  assert.deepEqual(
    clientCompletions.map((completion) => completion.reusedExisting).sort(),
    [false, true],
  );
  assert.equal(clientCompletions[0].run.id, clientCompletions[1].run.id);
  assert.equal(await prisma.gameAnalysisRun.count({ where: { importedGameId: clientGame.id } }), 1);
  assert.equal(await totalActivity('GAME_ANALYSES_COMPLETED'), 2);

  console.log('Activity producer integration tests passed.');
} finally {
  if (userId !== null) await prisma.appUser.delete({ where: { id: userId } });
  if (puzzleId !== null) await prisma.lichessPuzzle.deleteMany({ where: { id: puzzleId } });
  await prisma.$disconnect();
}
