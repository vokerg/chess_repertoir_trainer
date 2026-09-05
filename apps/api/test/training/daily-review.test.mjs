import assert from 'node:assert/strict';
import prismaModule from '../../dist/prisma.js';
import {
  ChapterService,
  CourseService,
  LineService,
  MoveNodeService,
} from '../../dist/modules/courses/courses.service.js';
import { resolveMarathonCandidates } from '../../dist/modules/training-marathons/training-marathon-candidates.service.js';
import {
  addReviewDays,
  nextSuccessfulReview,
} from '../../dist/modules/training-marathons/daily-review.policy.js';
import { DailyReviewService } from '../../dist/modules/training-marathons/daily-review.service.js';
import { TrainingMarathonRunService } from '../../dist/modules/training-marathons/training-marathon-runs.service.js';
import { TrainingService } from '../../dist/services/trainingService.js';

const prisma = prismaModule.default;
const fixedNow = new Date('2026-09-05T10:00:00.000Z');
let userId;
let otherUserId;

function stateWhere(user, subline) {
  return {
    userId_lineId_sublineHash_sublineKeyVersion: {
      userId: user,
      lineId: subline.lineId,
      sublineHash: subline.hash,
      sublineKeyVersion: subline.canonicalKeyVersion,
    },
  };
}

async function createRecordedSession(user, subline, trainingMode, result) {
  const session = await prisma.trainingSession.create({
    data: {
      userId: user,
      lineId: subline.lineId,
      result,
      completedAt: fixedNow,
      mistakesCount: result === 'FAILED' ? 1 : 0,
      totalExpectedMoves: 1,
      correctMoves: result === 'PASSED' ? 1 : 0,
    },
  });
  await prisma.trainingSublineAttempt.create({
    data: {
      userId: user,
      lineId: subline.lineId,
      trainingSessionId: session.id,
      sublineHash: subline.hash,
      sublineKeyVersion: subline.canonicalKeyVersion,
      movesJson: subline.moves,
      moveText: subline.moveText,
      trainingMode,
      result,
      passed: result === 'PASSED',
      mistakesCount: result === 'FAILED' ? 1 : 0,
      totalExpectedMoves: 1,
      correctMoves: result === 'PASSED' ? 1 : 0,
      completedAt: fixedNow,
    },
  });
  return session;
}

async function applyRecordedSession(user, subline, trainingMode, result, now = fixedNow) {
  const session = await createRecordedSession(user, subline, trainingMode, result);
  await prisma.$transaction((transaction) =>
    DailyReviewService.applyCompletedTrainingSession(transaction, user, session.id, result, now),
  );
  return prisma.repertoireSublineReviewState.findUniqueOrThrow({
    where: stateWhere(user, subline),
  });
}

async function finishRunItem(item, passed) {
  const expected = item.session.expectedMove;
  assert.ok(expected);
  if (!passed) {
    const wrong = expected === 'e2e4' ? 'd2d4' : 'e2e4';
    const wrongResult = await TrainingService.playMove(userId, item.session.sessionId, wrong);
    assert.equal(wrongResult.correct, false);
  }
  const result = await TrainingService.playMove(userId, item.session.sessionId, expected);
  assert.equal(result.completed, true);
  assert.equal(result.result, passed ? 'PASSED' : 'FAILED');
}

try {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `daily-review-${suffix}` },
  });
  const other = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `daily-review-other-${suffix}` },
  });
  userId = user.id;
  otherUserId = other.id;
  const course = await CourseService.create(userId, { name: 'Daily Review course' });
  const chapter = await ChapterService.create(userId, course.id, { name: 'Daily Review chapter' });
  const lineOne = await LineService.create(userId, chapter.id, {
    name: 'King pawn',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  const lineTwo = await LineService.create(userId, chapter.id, {
    name: 'Queen pawn',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  const seedLine = await LineService.create(userId, chapter.id, {
    name: 'Focused seed',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  await MoveNodeService.create(userId, lineOne.id, { moveUci: 'e2e4' });
  await MoveNodeService.create(userId, lineTwo.id, { moveUci: 'd2d4' });
  await MoveNodeService.create(userId, seedLine.id, { moveUci: 'g1f3' });

  const request = {
    mode: 'DAILY_REVIEW',
    lineIds: [lineOne.id, lineTwo.id],
    sublineHashes: [],
    recentSublineHashes: [],
    recentLineIds: [],
  };
  const resolved = await resolveMarathonCandidates(userId, request);
  const [sublineOne, sublineTwo] = resolved.sublines.sort((a, b) => a.lineId - b.lineId);

  await prisma.repertoireSublineReviewState.create({
    data: {
      userId,
      lineId: sublineOne.lineId,
      sublineHash: sublineOne.hash,
      sublineKeyVersion: sublineOne.canonicalKeyVersion,
      dueAt: addReviewDays(fixedNow, -1),
    },
  });
  await prisma.repertoireSublineReviewState.create({
    data: {
      userId,
      lineId: sublineTwo.lineId,
      sublineHash: sublineTwo.hash,
      sublineKeyVersion: sublineTwo.canonicalKeyVersion,
      dueAt: addReviewDays(fixedNow, 1),
    },
  });
  assert.deepEqual(
    (await DailyReviewService.loadDueSublines(userId, resolved.sublines, fixedNow)).map(
      (item) => item.hash,
    ),
    [sublineOne.hash],
  );

  await prisma.repertoireSublineReviewState.create({
    data: {
      userId: otherUserId,
      lineId: sublineTwo.lineId,
      sublineHash: sublineTwo.hash,
      sublineKeyVersion: sublineTwo.canonicalKeyVersion,
      dueAt: addReviewDays(fixedNow, -1),
    },
  });
  assert.deepEqual(
    await DailyReviewService.loadDueSublines(userId, [sublineTwo], fixedNow),
    [],
    'another user review state must not be visible',
  );

  let state = await applyRecordedSession(userId, sublineOne, 'DAILY_REVIEW', 'PASSED');
  assert.equal(state.intervalStage, 1);
  assert.equal(state.consecutiveSuccesses, 1);
  assert.equal(state.dueAt.toISOString(), addReviewDays(fixedNow, 3).toISOString());
  state = await applyRecordedSession(
    userId,
    sublineOne,
    'DAILY_REVIEW',
    'PASSED',
    addReviewDays(fixedNow, 3),
  );
  assert.equal(state.intervalStage, 2);
  assert.equal(state.consecutiveSuccesses, 2);
  assert.equal(state.dueAt.toISOString(), addReviewDays(fixedNow, 10).toISOString());

  await prisma.repertoireSublineReviewState.update({
    where: stateWhere(userId, sublineOne),
    data: { intervalStage: 5, dueAt: fixedNow },
  });
  state = await applyRecordedSession(userId, sublineOne, 'DAILY_REVIEW', 'PASSED');
  assert.equal(state.intervalStage, 5);
  assert.equal(state.dueAt.toISOString(), addReviewDays(fixedNow, 60).toISOString());
  assert.equal(
    nextSuccessfulReview({ intervalStage: 5, consecutiveSuccesses: 8 }, fixedNow).intervalStage,
    5,
  );

  state = await applyRecordedSession(userId, sublineOne, 'DAILY_REVIEW', 'FAILED');
  assert.equal(state.intervalStage, 0);
  assert.equal(state.consecutiveSuccesses, 0);
  assert.equal(state.failureCount, 1);
  assert.equal(state.dueAt.toISOString(), addReviewDays(fixedNow, 1).toISOString());
  const failedState = state;
  state = await applyRecordedSession(userId, sublineOne, 'DAILY_REVIEW_RETRY', 'PASSED');
  assert.equal(
    state.updatedAt.toISOString(),
    failedState.updatedAt.toISOString(),
    'reinforcement retry must not mutate review state',
  );
  state = await applyRecordedSession(userId, sublineOne, 'MARATHON', 'PASSED');
  assert.equal(
    state.updatedAt.toISOString(),
    failedState.updatedAt.toISOString(),
    'random marathon must not mutate review state',
  );

  const seedResolved = await resolveMarathonCandidates(userId, { ...request, lineIds: [seedLine.id] });
  const seedSubline = seedResolved.sublines[0];
  const focusedSession = await TrainingService.start(userId, seedLine.id);
  const focusedResult = await TrainingService.playMove(userId, focusedSession.sessionId, 'g1f3');
  assert.equal(focusedResult.result, 'PASSED');
  const seeded = await prisma.repertoireSublineReviewState.findUniqueOrThrow({ where: stateWhere(userId, seedSubline) });
  assert.equal(seeded.intervalStage, 0);
  assert.equal(seeded.consecutiveSuccesses, 0);
  const focusedRecord = await prisma.trainingSession.findUniqueOrThrow({ where: { id: focusedSession.sessionId } });
  assert.equal(seeded.dueAt.toISOString(), addReviewDays(focusedRecord.completedAt, 1).toISOString(), 'focused line training seeds tomorrow without counting as a scheduled success');

  await prisma.repertoireSublineReviewState.update({
    where: stateWhere(userId, sublineOne),
    data: { dueAt: fixedNow },
  });
  await prisma.repertoireSublineReviewState.update({
    where: stateWhere(userId, sublineTwo),
    data: { dueAt: fixedNow },
  });
  TrainingMarathonRunService.clearForTests();
  const run = await TrainingMarathonRunService.create(userId, request, fixedNow);
  assert.ok(run);
  const first = await TrainingMarathonRunService.next(userId, run.runId);
  assert.equal(first.state, 'ITEM');
  assert.equal(first.itemKind, 'SCHEDULED_REVIEW');
  await finishRunItem(first, false);

  const second = await TrainingMarathonRunService.next(userId, run.runId);
  assert.equal(second.state, 'ITEM');
  assert.equal(
    second.itemKind,
    'SCHEDULED_REVIEW',
    'untouched due material must be served before a retry',
  );
  assert.notEqual(second.subline.hash, first.subline.hash);
  await finishRunItem(second, true);

  const retry = await TrainingMarathonRunService.next(userId, run.runId);
  assert.equal(retry.state, 'ITEM');
  assert.equal(retry.itemKind, 'REINFORCEMENT_RETRY');
  assert.equal(retry.subline.hash, first.subline.hash);
  const retryStateBefore = await prisma.repertoireSublineReviewState.findUniqueOrThrow({
    where: stateWhere(
      userId,
      resolved.sublines.find((item) => item.hash === retry.subline.hash),
    ),
  });
  await finishRunItem(retry, true);
  const completed = await TrainingMarathonRunService.next(userId, run.runId);
  assert.deepEqual(completed, {
    state: 'COMPLETED',
    mode: 'DAILY_REVIEW',
    scope: null,
    completedCount: 2,
  });
  const retryStateAfter = await prisma.repertoireSublineReviewState.findUniqueOrThrow({
    where: stateWhere(
      userId,
      resolved.sublines.find((item) => item.hash === retry.subline.hash),
    ),
  });
  assert.equal(
    retryStateAfter.dueAt.toISOString(),
    retryStateBefore.dueAt.toISOString(),
    'clean retry must leave tomorrow scheduled',
  );

  const emptyRun = await TrainingMarathonRunService.create(
    userId,
    request,
    new Date('1900-01-01T00:00:00.000Z'),
  );
  assert.ok(emptyRun);
  const emptyCompletion = await TrainingMarathonRunService.next(userId, emptyRun.runId);
  assert.equal(emptyCompletion.state, 'COMPLETED');

  const oldHash = sublineTwo.hash;
  const root = resolved.preparedLines.get(lineTwo.id).tree.root.children[0].node;
  await MoveNodeService.create(userId, lineTwo.id, { parentId: root.id, moveUci: 'e7e5' });
  const changed = await resolveMarathonCandidates(userId, request);
  assert.ok(changed.sublines.every((item) => item.hash !== oldHash));
  assert.deepEqual(
    await DailyReviewService.loadDueSublines(
      userId,
      changed.sublines.filter((item) => item.lineId === lineTwo.id),
      new Date('2100-01-01T00:00:00.000Z'),
    ),
    [],
    'changed canonical sublines must not inherit stale review state',
  );

  const randomRun = await TrainingMarathonRunService.create(userId, { ...request, mode: 'ALL' });
  assert.ok(randomRun);
  const statesBeforeRandom = await prisma.repertoireSublineReviewState.findMany({ where: { userId }, orderBy: [{ lineId: 'asc' }, { sublineHash: 'asc' }] });
  const randomItem = await TrainingMarathonRunService.next(userId, randomRun.runId);
  assert.equal(randomItem.state, 'ITEM', 'normal random marathon remains non-finite');
  await finishRunItem(randomItem, true);
  const statesAfterRandom = await prisma.repertoireSublineReviewState.findMany({ where: { userId }, orderBy: [{ lineId: 'asc' }, { sublineHash: 'asc' }] });
  assert.deepEqual(statesAfterRandom, statesBeforeRandom, 'completed random training must not create or update review scheduling');

  await LineService.delete(userId, seedLine.id);
  assert.equal(
    await prisma.repertoireSublineReviewState.count({ where: { userId, lineId: seedLine.id } }),
    0,
    'deleted lines must cascade their review state',
  );

  console.log('Daily Review tests passed.');
} finally {
  TrainingMarathonRunService.clearForTests();
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  if (otherUserId) await prisma.appUser.delete({ where: { id: otherUserId } });
  await prisma.$disconnect();
}
