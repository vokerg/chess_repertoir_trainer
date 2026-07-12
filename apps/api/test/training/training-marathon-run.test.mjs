import assert from 'node:assert/strict';
import prismaModule from '../../dist/prisma.js';
import { ChapterService, CourseService, LineService, MoveNodeService } from '../../dist/modules/courses/courses.service.js';
import { MarathonRunStaleError, TrainingMarathonRunService } from '../../dist/modules/training-marathons/training-marathon-runs.service.js';

const prisma = prismaModule.default;
let userId;
try {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.appUser.create({ data: { authProvider: 'test', authSubject: `marathon-run-${suffix}` } });
  userId = user.id;
  const course = await CourseService.create(userId, { name: 'Run course' });
  const chapter = await ChapterService.create(userId, course.id, { name: 'Run chapter' });
  const line = await LineService.create(userId, chapter.id, { name: 'Run line', sideToTrain: 'WHITE', startingFen: 'startpos' });
  const rootNode = await MoveNodeService.create(userId, line.id, { moveUci: 'e2e4' });

  const originalFindMany = prisma.line.findMany.bind(prisma.line);
  let lineReads = 0;
  prisma.line.findMany = (...args) => { lineReads += 1; return originalFindMany(...args); };
  try {
    const run = await TrainingMarathonRunService.create(userId, { mode: 'ALL', lineIds: [line.id], sublineHashes: [], recentSublineHashes: [], recentLineIds: [] });
    assert.ok(run?.runId);
    assert.equal(lineReads, 1);
    TrainingMarathonRunService.fillToCapacityForTests(run.runId);
    assert.equal(TrainingMarathonRunService.sizeForTests(), 1000);
    assert.equal(await TrainingMarathonRunService.next(userId + 1, run.runId), null);
    const first = await TrainingMarathonRunService.next(userId, run.runId);
    assert.ok(first?.session.sessionId);
    assert.equal(TrainingMarathonRunService.sizeForTests(), 1000, 'next at capacity must not evict an active run');
    assert.equal(lineReads, 1, 'continuation must reuse prepared line data');

    TrainingMarathonRunService.clearForTests();
    const untrained = await TrainingMarathonRunService.create(userId, { mode: 'UNTRAINED_SUBLINES', lineIds: [line.id], sublineHashes: [], recentSublineHashes: [], recentLineIds: [] });
    assert.ok(await TrainingMarathonRunService.next(userId, untrained.runId));
    assert.equal(await TrainingMarathonRunService.next(userId, untrained.runId), null, 'untrained candidate must be served once');

    TrainingMarathonRunService.clearForTests();
    const retryable = await TrainingMarathonRunService.create(userId, { mode: 'UNTRAINED_SUBLINES', lineIds: [line.id], sublineHashes: [], recentSublineHashes: [], recentLineIds: [] });
    const originalCreate = prisma.trainingSession.create.bind(prisma.trainingSession);
    prisma.trainingSession.create = () => Promise.reject(new Error('simulated write failure'));
    await assert.rejects(TrainingMarathonRunService.next(userId, retryable.runId), /simulated write failure/);
    prisma.trainingSession.create = originalCreate;
    assert.ok(await TrainingMarathonRunService.next(userId, retryable.runId), 'failed creation must leave the candidate eligible');

    TrainingMarathonRunService.clearForTests();
    const weak = await TrainingMarathonRunService.create(userId, { mode: 'WEAK_SUBLINES', lineIds: [line.id], sublineHashes: [], recentSublineHashes: [], recentLineIds: [] });
    const originalQueryRaw = prisma.$queryRaw.bind(prisma);
    let attemptReads = 0;
    prisma.$queryRaw = (...args) => { attemptReads += 1; return originalQueryRaw(...args); };
    const lineReadsBeforeWeakNext = lineReads;
    try {
      assert.ok(await TrainingMarathonRunService.next(userId, weak.runId));
      assert.equal(attemptReads, 1, 'weak continuation must use one bounded attempt query');
      assert.equal(lineReads, lineReadsBeforeWeakNext, 'weak continuation must not reconstruct lines');
    } finally {
      prisma.$queryRaw = originalQueryRaw;
    }

    TrainingMarathonRunService.clearForTests();
    const stale = await TrainingMarathonRunService.create(userId, { mode: 'ALL', lineIds: [line.id], sublineHashes: [], recentSublineHashes: [], recentLineIds: [] });
    await MoveNodeService.create(userId, line.id, { parentId: rootNode.id, moveUci: 'e7e5' });
    await assert.rejects(TrainingMarathonRunService.next(userId, stale.runId), MarathonRunStaleError);
  } finally {
    prisma.line.findMany = originalFindMany;
    TrainingMarathonRunService.clearForTests();
  }
  console.log('Training marathon run tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
