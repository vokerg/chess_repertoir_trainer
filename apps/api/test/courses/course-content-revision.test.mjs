import assert from 'node:assert/strict';
import { normalizeFenForPosition } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import {
  ChapterService,
  CourseService,
  LineService,
  MoveNodeService,
} from '../../dist/modules/courses/courses.service.js';
import { AnalysisReintegrationService } from '../../dist/modules/courses/analysis-reintegration.service.js';
import { PgnService } from '../../dist/services/pgnService.js';

const prisma = prismaModule.default;
let userId;

async function revision(courseId) {
  return (await prisma.course.findUniqueOrThrow({ where: { id: courseId } })).contentRevision;
}

async function expectRevisionDelta(courseId, delta, operation) {
  const before = await revision(courseId);
  const result = await operation();
  assert.equal(await revision(courseId), before + delta);
  return result;
}

try {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `course-revision-${suffix}` },
  });
  userId = user.id;

  const courseA = await CourseService.create(userId, { name: 'Revision A' });
  const courseB = await CourseService.create(userId, { name: 'Revision B' });
  assert.equal(courseA.contentRevision, 1);

  await expectRevisionDelta(courseA.id, 1, () => CourseService.update(userId, courseA.id, { description: 'Changed' }));
  const chapterA = await expectRevisionDelta(courseA.id, 1, () => ChapterService.create(userId, courseA.id, { name: 'A', sortOrder: 2 }));
  const chapterA2 = await expectRevisionDelta(courseA.id, 1, () => ChapterService.create(userId, courseA.id, { name: 'A2', sortOrder: 1 }));
  const chapterB = await expectRevisionDelta(courseB.id, 1, () => ChapterService.create(userId, courseB.id, { name: 'B' }));
  assert.ok(chapterA && chapterA2 && chapterB);
  await expectRevisionDelta(courseA.id, 1, () => ChapterService.update(userId, chapterA.id, { name: 'A updated' }));

  const disposableChapter = await expectRevisionDelta(courseA.id, 1, () => ChapterService.create(userId, courseA.id, { name: 'Disposable' }));
  assert.ok(disposableChapter);
  await expectRevisionDelta(courseA.id, 1, () => ChapterService.delete(userId, disposableChapter.id));

  const line = await expectRevisionDelta(courseA.id, 1, () => LineService.create(userId, chapterA.id, {
    name: 'Main', sideToTrain: 'WHITE', startingFen: 'startpos', tags: JSON.stringify(['core']),
  }));
  assert.ok(line);
  await expectRevisionDelta(courseA.id, 1, () => LineService.update(userId, line.id, { notes: 'Updated' }));
  await expectRevisionDelta(courseA.id, 1, () => LineService.update(userId, line.id, { chapterId: chapterA2.id }));

  const root = await expectRevisionDelta(courseA.id, 1, () => MoveNodeService.create(userId, line.id, {
    moveUci: 'e2e4', comment: 'Root comment', annotation: '!', branchLabel: 'Main',
  }));
  await expectRevisionDelta(courseA.id, 1, () => MoveNodeService.update(userId, root.id, { comment: 'Changed comment' }));
  await expectRevisionDelta(courseA.id, 0, () => MoveNodeService.update(userId, root.id, { comment: 'Changed comment' }));

  const sourceBeforeCopy = await revision(courseA.id);
  const targetBeforeCopy = await revision(courseB.id);
  const copied = await LineService.copy(userId, line.id, chapterB.id, 'Copied');
  assert.ok(copied);
  assert.equal(await revision(courseA.id), sourceBeforeCopy);
  assert.equal(await revision(courseB.id), targetBeforeCopy + 1);

  const sourceBeforeMove = await revision(courseB.id);
  const destinationBeforeMove = await revision(courseA.id);
  await LineService.update(userId, copied.id, { chapterId: chapterA.id });
  assert.equal(await revision(courseB.id), sourceBeforeMove + 1);
  assert.equal(await revision(courseA.id), destinationBeforeMove + 1);
  await expectRevisionDelta(courseA.id, 1, () => LineService.delete(userId, copied.id));

  await expectRevisionDelta(courseA.id, 1, () => PgnService.importLine(userId, chapterA.id, {
    name: 'Imported', sideToTrain: 'BLACK', pgn: '1. d4 d5',
  }));

  await expectRevisionDelta(courseA.id, 1, () => AnalysisReintegrationService.applyToChapter(userId, chapterA.id, {
    analysisTree: { rootFen: 'startpos', children: [{ moveUci: 'c2c4', children: [] }] },
    target: { kind: 'NEW_LINE', name: 'Analysis line', sideToTrain: 'BLACK', allowConflicts: true },
  }));

  await expectRevisionDelta(courseA.id, 1, () => AnalysisReintegrationService.applyToChapter(userId, chapterA2.id, {
    analysisTree: { rootFen: root.fenAfter, children: [{ moveUci: 'e7e5', children: [] }] },
    target: {
      kind: 'EXISTING_LINE',
      lineId: line.id,
      anchor: { kind: 'NODE', nodeId: root.id, normalizedFen: normalizeFenForPosition(root.fenAfter) },
      allowConflicts: false,
    },
  }));

  await expectRevisionDelta(courseA.id, 1, () => MoveNodeService.deleteSubtree(userId, root.id));
  const disposableLine = await expectRevisionDelta(courseA.id, 1, () => LineService.create(userId, chapterA.id, {
    name: 'Disposable line', sideToTrain: 'WHITE', startingFen: 'startpos',
  }));
  assert.ok(disposableLine);
  await expectRevisionDelta(courseA.id, 1, () => LineService.delete(userId, disposableLine.id));

  console.log('Course content revision tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
