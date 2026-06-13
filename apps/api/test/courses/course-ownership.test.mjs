import assert from 'node:assert/strict';
import prismaModule from '../../dist/prisma.js';
import {
  ChapterService,
  CourseService,
  LineService,
  MoveNodeService,
} from '../../dist/modules/courses/courses.service.js';

const prisma = prismaModule.default;

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const users = [];

try {
  const userA = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `course-owner-a-${suffix}` },
  });
  const userB = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `course-owner-b-${suffix}` },
  });
  users.push(userA.id, userB.id);

  const courseA = await CourseService.create(userA.id, { name: 'User A course' });
  const courseB = await CourseService.create(userB.id, { name: 'User B course' });
  assert.equal(courseA.userId, userA.id);

  assert.deepEqual((await CourseService.list(userA.id)).map((course) => course.id), [courseA.id]);
  assert.equal(await CourseService.get(userA.id, courseB.id), null);
  assert.equal(await CourseService.update(userA.id, courseB.id, { name: 'Unauthorized' }), null);
  assert.equal(await CourseService.delete(userA.id, courseB.id), null);
  assert.equal((await CourseService.get(userB.id, courseB.id))?.name, 'User B course');

  const chapterB = await ChapterService.create(userB.id, courseB.id, { name: 'User B chapter' });
  assert.ok(chapterB);
  const lineB = await LineService.create(userB.id, chapterB.id, {
    name: 'User B line',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  assert.ok(lineB);
  const nodeB = await MoveNodeService.create(userB.id, lineB.id, { moveUci: 'e2e4' });

  assert.equal(await ChapterService.get(userA.id, chapterB.id), null);
  assert.equal(await ChapterService.list(userA.id, courseB.id), null);
  assert.equal(await LineService.get(userA.id, lineB.id), null);
  assert.equal(await LineService.list(userA.id, chapterB.id), null);
  assert.equal(await LineService.getMoveTree(userA.id, lineB.id), null);
  assert.equal(await MoveNodeService.update(userA.id, nodeB.id, { comment: 'Unauthorized' }), null);
  assert.equal(await MoveNodeService.deleteSubtree(userA.id, nodeB.id), null);
  assert.equal((await MoveNodeService.update(userB.id, nodeB.id, { comment: 'Owned' }))?.comment, 'Owned');

  console.log('Course ownership tests passed.');
} finally {
  if (users.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: users } } });
  }
  await prisma.$disconnect();
}
