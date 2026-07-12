import assert from 'node:assert/strict';
import { courseOverviewSchema, libraryCatalogSchema } from '@chess-trainer/contracts/courses';
import prismaModule from '../../dist/prisma.js';
import { ChapterService, CourseService, LineService, MoveNodeService } from '../../dist/modules/courses/courses.service.js';
import { CourseDerivedDataService } from '../../dist/modules/courses/course-derived-data.service.js';

const prisma = prismaModule.default;
let userId;
try {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.appUser.create({ data: { authProvider: 'test', authSubject: `course-read-model-${suffix}` } });
  userId = user.id;
  const course = await CourseService.create(userId, { name: 'Catalog course', description: 'Lean read model' });
  const chapter = await ChapterService.create(userId, course.id, { name: 'Chapter', sortOrder: 1 });
  const line = await LineService.create(userId, chapter.id, { name: 'Line', sideToTrain: 'WHITE', startingFen: 'startpos' });
  await MoveNodeService.create(userId, line.id, { moveUci: 'e2e4' });

  const originalQueryRaw = prisma.$queryRaw.bind(prisma);
  let attemptReads = 0;
  prisma.$queryRaw = (...args) => { attemptReads += 1; return originalQueryRaw(...args); };
  try {
    const catalog = libraryCatalogSchema.parse(await CourseDerivedDataService.catalog(userId));
    assert.equal(attemptReads, 1);
    assert.equal(catalog.courses.length, 1);
    assert.equal(catalog.courses[0].chapters[0].lines[0].trainingStats.activeSublineCount, 1);

    attemptReads = 0;
    const overview = courseOverviewSchema.parse(await CourseDerivedDataService.overview(userId, course.id));
    assert.equal(attemptReads, 1);
    assert.equal(overview.sublines.length, 1);
    assert.equal(overview.stats.activeSublineCount, 1);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
  }
  assert.equal(await CourseDerivedDataService.overview(userId + 1, course.id), null);
  console.log('Course read-model tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
