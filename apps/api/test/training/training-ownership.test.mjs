import assert from 'node:assert/strict';
import Fastify from 'fastify';
import prismaModule from '../../dist/prisma.js';
import {
  ChapterService,
  CourseService,
  LineService,
  MoveNodeService,
} from '../../dist/modules/courses/courses.service.js';
import { StatsService } from '../../dist/services/statsService.js';
import { TrainingService } from '../../dist/services/trainingService.js';
import trainingModule from '../../dist/modules/training/training.routes.js';

const prisma = prismaModule.default;
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds = [];
let app;

async function createTrainableLine(userId, name) {
  const course = await CourseService.create(userId, { name: `${name} course` });
  const chapter = await ChapterService.create(userId, course.id, { name: `${name} chapter` });
  assert.ok(chapter);
  const line = await LineService.create(userId, chapter.id, {
    name: `${name} line`,
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  assert.ok(line);
  await MoveNodeService.create(userId, line.id, { moveUci: 'e2e4' });
  return line;
}

try {
  const userA = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `training-owner-a-${suffix}` },
  });
  const userB = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `training-owner-b-${suffix}` },
  });
  userIds.push(userA.id, userB.id);

  const lineA = await createTrainableLine(userA.id, 'User A');
  const lineB = await createTrainableLine(userB.id, 'User B');

  await assert.rejects(
    TrainingService.start(userA.id, lineB.id),
    /Line not found/,
  );

  app = Fastify();
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = {
      userId: userA.id,
      provider: 'dev',
      externalSubject: `training-owner-a-${suffix}`,
    };
  });
  await app.register(trainingModule);

  const startResponse = await app.inject({
    method: 'POST',
    url: `/api/lines/${lineA.id}/training/start`,
  });
  assert.equal(startResponse.statusCode, 200);
  const sessionA = startResponse.json();
  const sessionB = await TrainingService.start(userB.id, lineB.id);
  const storedSessionA = await prisma.trainingSession.findUnique({ where: { id: sessionA.sessionId } });
  assert.equal(storedSessionA?.userId, userA.id);

  await assert.rejects(
    TrainingService.playMove(userA.id, sessionB.sessionId, 'e2e4'),
    /Training session not found/,
  );
  assert.equal(await TrainingService.getReview(userA.id, sessionB.sessionId), null);
  await assert.rejects(
    TrainingService.complete(userA.id, sessionB.sessionId),
    /Training session not found/,
  );
  await assert.rejects(
    TrainingService.abandon(userA.id, sessionB.sessionId),
    /Training session not found/,
  );

  const storedSessionB = await prisma.trainingSession.findUnique({ where: { id: sessionB.sessionId } });
  assert.equal(storedSessionB?.result, 'IN_PROGRESS');

  const historyA = await TrainingService.listHistory(userA.id);
  assert.deepEqual(historyA.map((session) => session.id), [sessionA.sessionId]);

  const statsA = await StatsService.summary(userA.id);
  const statsB = await StatsService.summary(userB.id);
  assert.equal(statsA.totalTrainingSessions, 1);
  assert.equal(statsB.totalTrainingSessions, 1);

  console.log('Training ownership tests passed.');
} finally {
  if (app) await app.close();
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}
