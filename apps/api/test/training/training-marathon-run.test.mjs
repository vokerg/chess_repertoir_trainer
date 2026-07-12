import assert from 'node:assert/strict';
import prismaModule from '../../dist/prisma.js';
import { ChapterService, CourseService, LineService, MoveNodeService } from '../../dist/modules/courses/courses.service.js';
import { TrainingMarathonRunService } from '../../dist/modules/training-marathons/training-marathon-runs.service.js';

const prisma = prismaModule.default;
let userId;
try {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.appUser.create({ data: { authProvider: 'test', authSubject: `marathon-run-${suffix}` } });
  userId = user.id;
  const course = await CourseService.create(userId, { name: 'Run course' });
  const chapter = await ChapterService.create(userId, course.id, { name: 'Run chapter' });
  const line = await LineService.create(userId, chapter.id, { name: 'Run line', sideToTrain: 'WHITE', startingFen: 'startpos' });
  await MoveNodeService.create(userId, line.id, { moveUci: 'e2e4' });

  const originalFindMany = prisma.line.findMany.bind(prisma.line);
  let lineReads = 0;
  prisma.line.findMany = (...args) => { lineReads += 1; return originalFindMany(...args); };
  try {
    const run = await TrainingMarathonRunService.create(userId, { mode: 'ALL', lineIds: [line.id], sublineHashes: [], recentSublineHashes: [], recentLineIds: [] });
    assert.ok(run?.runId);
    assert.equal(lineReads, 1);
    assert.equal(await TrainingMarathonRunService.next(userId + 1, run.runId), null);
    const first = await TrainingMarathonRunService.next(userId, run.runId);
    const second = await TrainingMarathonRunService.next(userId, run.runId);
    assert.ok(first?.session.sessionId);
    assert.ok(second?.session.sessionId);
    assert.equal(lineReads, 1, 'continuation must reuse prepared line data');
  } finally {
    prisma.line.findMany = originalFindMany;
    TrainingMarathonRunService.clearForTests();
  }
  console.log('Training marathon run tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
