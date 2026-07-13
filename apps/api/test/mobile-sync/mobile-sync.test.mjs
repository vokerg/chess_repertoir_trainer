import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mobileCourseBundleSchema, mobileSyncManifestSchema } from '@chess-trainer/contracts/mobile-sync';
import {
  applySerializableTrainingMove,
  createSerializableTrainingSession,
  finishSerializableTrainingEarly,
} from 'chess-domain/training';
import prismaModule from '../../dist/prisma.js';
import { ChapterService, CourseService, LineService, MoveNodeService } from '../../dist/modules/courses/courses.service.js';
import { MobileSyncService } from '../../dist/modules/mobile-sync/mobile-sync.service.js';
import { StatsService } from '../../dist/services/statsService.js';
import { TrainingService } from '../../dist/services/trainingService.js';

const prisma = prismaModule.default;
const userIds = [];

function iso(milliseconds) {
  return new Date(milliseconds).toISOString();
}

function toAttempt(courseId, revision, subline, session, overrides = {}) {
  return {
    attemptSchemaVersion: 1,
    clientAttemptId: randomUUID(),
    courseId,
    courseContentRevision: revision,
    trainingMode: 'LINE',
    session,
    subline,
    events: session.events,
    counters: session.counters,
    ...overrides,
  };
}

function wrongRetryAttempt(courseId, revision, subline, startedAt = Date.now() - 60_000) {
  let session = createSerializableTrainingSession({
    sessionId: randomUUID(), courseContentRevision: revision, startedAt: iso(startedAt), subline,
  });
  session = applySerializableTrainingMove(session, subline, 'd2d4', iso(startedAt + 1_000)).session;
  session = applySerializableTrainingMove(session, subline, 'e2e4', iso(startedAt + 2_000)).session;
  return toAttempt(courseId, revision, subline, session);
}

function earlyFinishAttempt(courseId, revision, subline, startedAt = Date.now() - 45_000) {
  let session = createSerializableTrainingSession({
    sessionId: randomUUID(), courseContentRevision: revision, startedAt: iso(startedAt), subline,
  });
  session = finishSerializableTrainingEarly(session, subline, iso(startedAt + 1_000)).session;
  return toAttempt(courseId, revision, subline, session);
}

async function createTrainableCourse(userId, name, tags = []) {
  const course = await CourseService.create(userId, { name, description: `${name} description` });
  const later = await ChapterService.create(userId, course.id, { name: 'Later', sortOrder: 20 });
  const earlier = await ChapterService.create(userId, course.id, { name: 'Earlier', sortOrder: 10 });
  assert.ok(later && earlier);
  const line = await LineService.create(userId, later.id, {
    name: `${name} line`, sideToTrain: 'WHITE', startingFen: 'startpos',
    tags: JSON.stringify(tags), notes: 'Offline notes',
  });
  assert.ok(line);
  const node = await MoveNodeService.create(userId, line.id, {
    moveUci: 'e2e4', comment: 'Take the centre', annotation: '!', branchLabel: 'Main line',
  });
  return { course, later, earlier, line, node };
}

try {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const userA = await prisma.appUser.create({ data: { authProvider: 'test', authSubject: `mobile-sync-a-${suffix}` } });
  const userB = await prisma.appUser.create({ data: { authProvider: 'test', authSubject: `mobile-sync-b-${suffix}` } });
  userIds.push(userA.id, userB.id);

  const owned = await createTrainableCourse(userA.id, 'Owned', ['core', 'white']);
  const unowned = await createTrainableCourse(userB.id, 'Unowned');

  const manifest = mobileSyncManifestSchema.parse(await MobileSyncService.manifest(userA.id));
  assert.deepEqual(manifest.courses.map((course) => course.courseId), [owned.course.id]);
  assert.equal(manifest.courses[0].contentRevision, (await prisma.course.findUniqueOrThrow({ where: { id: owned.course.id } })).contentRevision);
  assert.equal(manifest.manifestSchemaVersion, 1);
  assert.equal(manifest.bundleSchemaVersion, 1);

  const bundle = mobileCourseBundleSchema.parse(await MobileSyncService.courseBundle(userA.id, owned.course.id));
  assert.ok(bundle);
  assert.equal(await MobileSyncService.courseBundle(userA.id, unowned.course.id), null);
  assert.deepEqual(bundle.chapters.map((chapter) => chapter.id), [owned.earlier.id, owned.later.id]);
  assert.deepEqual(bundle.lines[0].tags, ['core', 'white']);
  assert.equal(bundle.sublines.length, 1);
  assert.equal(bundle.sublines[0].moves[0].fenBefore, 'startpos');
  assert.equal(bundle.sublines[0].moves[0].fenAfter, owned.node.fenAfter);
  assert.equal(bundle.sublines[0].moves[0].comment, 'Take the centre');
  assert.equal(bundle.sublines[0].moves[0].annotation, '!');
  assert.equal(bundle.sublines[0].moves[0].branchLabel, 'Main line');
  assert.ok(bundle.moveNodes.every((node) => bundle.lines.some((line) => line.id === node.lineId)));
  assert.ok(bundle.sublines.every((subline) => bundle.lines.some((line) => line.id === subline.lineId)));
  assert.ok(bundle.sublines.flatMap((subline) => subline.moves).every((move) => bundle.moveNodes.some((node) => node.id === move.nodeId)));

  const subline = bundle.sublines[0];
  const acceptedAttempt = wrongRetryAttempt(bundle.courseId, bundle.contentRevision, subline);
  const accepted = await MobileSyncService.ingestTrainingAttempts(userA.id, {
    deviceId: 'device-a', attempts: [acceptedAttempt],
  });
  assert.equal(accepted.results[0].status, 'ACCEPTED');
  const acceptedSessionId = accepted.results[0].trainingSessionId;
  assert.ok(acceptedSessionId);

  const stored = await prisma.trainingSession.findUniqueOrThrow({
    where: { id: acceptedSessionId }, include: { attempts: { orderBy: { createdAt: 'asc' } }, sublineAttempt: true },
  });
  assert.equal(stored.clientAttemptId, acceptedAttempt.clientAttemptId);
  assert.equal(stored.source, 'MOBILE_OFFLINE');
  assert.equal(stored.sourceDeviceId, 'device-a');
  assert.equal(stored.courseContentRevision, bundle.contentRevision);
  assert.equal(stored.startedAt.toISOString(), acceptedAttempt.session.startedAt);
  assert.equal(stored.completedAt?.toISOString(), acceptedAttempt.session.completedAt);
  assert.equal(stored.mistakesCount, 1);
  assert.equal(stored.correctMoves, 1);
  assert.equal(stored.totalExpectedMoves, 2);
  assert.equal(stored.accuracy, 0.5);
  assert.equal(stored.attempts.length, 2);
  assert.deepEqual(stored.sublineAttempt?.movesJson, subline);

  const duplicate = await MobileSyncService.ingestTrainingAttempts(userA.id, {
    deviceId: 'device-a', attempts: [acceptedAttempt],
  });
  assert.equal(duplicate.results[0].status, 'DUPLICATE');
  assert.equal(duplicate.results[0].trainingSessionId, acceptedSessionId);
  assert.equal(duplicate.results[0].receivedAt, accepted.results[0].receivedAt);

  const early = earlyFinishAttempt(bundle.courseId, bundle.contentRevision, subline);
  const badCountersBase = earlyFinishAttempt(bundle.courseId, bundle.contentRevision, subline);
  const badCounters = { ...badCountersBase, counters: { ...badCountersBase.counters, mistakesCount: 0 } };
  const partial = await MobileSyncService.ingestTrainingAttempts(userA.id, {
    deviceId: 'device-a', attempts: [early, badCounters],
  });
  assert.deepEqual(partial.results.map((result) => result.status), ['ACCEPTED', 'REJECTED']);
  assert.equal(partial.results[1].rejectionCode, 'COUNTERS_MISMATCH');
  const earlyMoves = await prisma.trainingAttemptMove.findMany({ where: { sessionId: partial.results[0].trainingSessionId } });
  assert.equal(earlyMoves.length, 1);
  assert.equal(earlyMoves[0].playedMoveUci, null);
  assert.equal(earlyMoves[0].wasCorrect, false);

  const tamperedBase = wrongRetryAttempt(bundle.courseId, bundle.contentRevision, subline);
  const tamperedEvents = tamperedBase.events.map((event, index) => index === 1 ? { ...event, playedMoveUci: 'g1f3' } : event);
  const tampered = {
    ...tamperedBase,
    events: tamperedEvents,
    session: { ...tamperedBase.session, events: tamperedEvents },
  };
  const tamperedResult = await MobileSyncService.ingestTrainingAttempts(userA.id, { deviceId: 'device-a', attempts: [tampered] });
  assert.equal(tamperedResult.results[0].status, 'REJECTED');
  assert.equal(tamperedResult.results[0].rejectionCode, 'INVALID_EVENT_SEQUENCE');

  const tamperedSnapshotBase = earlyFinishAttempt(bundle.courseId, bundle.contentRevision, subline);
  const tamperedSnapshot = {
    ...tamperedSnapshotBase,
    subline: {
      ...tamperedSnapshotBase.subline,
      moves: tamperedSnapshotBase.subline.moves.map((move, index) => index === 0 ? { ...move, comment: 'Tampered' } : move),
    },
  };
  const tamperedSnapshotResult = await MobileSyncService.ingestTrainingAttempts(userA.id, { deviceId: 'device-a', attempts: [tamperedSnapshot] });
  assert.equal(tamperedSnapshotResult.results[0].rejectionCode, 'INVALID_SNAPSHOT');

  const unsupported = { ...earlyFinishAttempt(bundle.courseId, bundle.contentRevision, subline), attemptSchemaVersion: 2 };
  const unsupportedResult = await MobileSyncService.ingestTrainingAttempts(userA.id, { deviceId: 'device-a', attempts: [unsupported] });
  assert.equal(unsupportedResult.results[0].rejectionCode, 'UNSUPPORTED_SCHEMA_VERSION');

  const unownedBundle = mobileCourseBundleSchema.parse(await MobileSyncService.courseBundle(userB.id, unowned.course.id));
  const unownedAttempt = earlyFinishAttempt(unownedBundle.courseId, unownedBundle.contentRevision, unownedBundle.sublines[0]);
  const unownedResult = await MobileSyncService.ingestTrainingAttempts(userA.id, { deviceId: 'device-a', attempts: [unownedAttempt] });
  assert.equal(unownedResult.results[0].rejectionCode, 'CONTENT_NOT_OWNED');

  const deleted = await createTrainableCourse(userA.id, 'Deleted');
  const deletedBundle = mobileCourseBundleSchema.parse(await MobileSyncService.courseBundle(userA.id, deleted.course.id));
  const deletedAttempt = earlyFinishAttempt(deletedBundle.courseId, deletedBundle.contentRevision, deletedBundle.sublines[0]);
  await LineService.delete(userA.id, deleted.line.id);
  const deletedResult = await MobileSyncService.ingestTrainingAttempts(userA.id, { deviceId: 'device-a', attempts: [deletedAttempt] });
  assert.equal(deletedResult.results[0].rejectionCode, 'CONTENT_GONE');

  const futureAttempt = earlyFinishAttempt(bundle.courseId, bundle.contentRevision, subline, Date.now() + 10 * 60_000);
  const futureResult = await MobileSyncService.ingestTrainingAttempts(userA.id, { deviceId: 'device-a', attempts: [futureAttempt] });
  assert.equal(futureResult.results[0].rejectionCode, 'INVALID_TIMESTAMP');

  const futureRevisionAttempt = earlyFinishAttempt(bundle.courseId, bundle.contentRevision + 100, subline);
  const futureRevisionResult = await MobileSyncService.ingestTrainingAttempts(userA.id, { deviceId: 'device-a', attempts: [futureRevisionAttempt] });
  assert.equal(futureRevisionResult.results[0].rejectionCode, 'INVALID_SNAPSHOT');

  const history = await TrainingService.listHistory(userA.id);
  assert.ok(history.some((session) => session.id === acceptedSessionId));
  assert.ok(history.some((session) => session.id === partial.results[0].trainingSessionId));
  const review = await TrainingService.getReview(userA.id, acceptedSessionId);
  assert.equal(review?.mistakes.length, 1);
  assert.equal(review?.mistakes[0].comment, 'Take the centre');
  const stats = await StatsService.lineStats(userA.id, owned.line.id);
  assert.equal(stats?.totalAttempts, 2);
  assert.equal(stats?.failedCount, 2);

  console.log('Mobile sync tests passed.');
} finally {
  if (userIds.length > 0) await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
}
