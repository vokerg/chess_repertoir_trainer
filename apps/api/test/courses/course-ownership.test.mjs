import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import {
  chapterListSchema,
  chapterSchema,
  coursePositionSuggestionsResponseSchema,
} from '@chess-trainer/contracts/courses';
import prismaModule from '../../dist/prisma.js';
import coursesModule from '../../dist/modules/courses/courses.routes.js';
import {
  ChapterService,
  CoursePositionSuggestionService,
  CourseService,
  LineService,
  MoveNodeService,
} from '../../dist/modules/courses/courses.service.js';

const prisma = prismaModule.default;

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const users = [];
let app;

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

  const chapterA = await ChapterService.create(userA.id, courseA.id, { name: 'User A chapter', sortOrder: 2 });
  assert.ok(chapterA);
  const lineA = await LineService.create(userA.id, chapterA.id, {
    name: 'Alpha line',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  assert.ok(lineA);
  const nodeA = await MoveNodeService.create(userA.id, lineA.id, { moveUci: 'e2e4' });
  assert.equal(nodeA.fenBeforeNormalized, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');

  const secondCourseA = await CourseService.create(userA.id, { name: 'Another user A course' });
  const secondChapterA = await ChapterService.create(userA.id, secondCourseA.id, { name: 'Earlier chapter', sortOrder: 1 });
  assert.ok(secondChapterA);
  const secondLineA = await LineService.create(userA.id, secondChapterA.id, {
    name: 'Beta line',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
  });
  assert.ok(secondLineA);
  await MoveNodeService.create(userA.id, secondLineA.id, { moveUci: 'd2d4' });

  const copiedLine = await LineService.copy(userA.id, lineA.id, secondChapterA.id, 'Alpha copy');
  assert.ok(copiedLine);
  const copiedNodes = await prisma.moveNode.findMany({ where: { lineId: copiedLine.id }, orderBy: { id: 'asc' } });
  assert.equal(copiedNodes.length, 1);
  assert.equal(copiedNodes[0].fenBeforeNormalized, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');

  const positionFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 7 42';
  const positionSuggestions = await CoursePositionSuggestionService.listForFen(userA.id, positionFen);
  assert.deepEqual(coursePositionSuggestionsResponseSchema.parse(positionSuggestions), positionSuggestions);
  assert.equal(positionSuggestions.normalizedFen, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
  assert.deepEqual(
    positionSuggestions.suggestions.map((suggestion) => ({
      courseName: suggestion.courseName,
      lineName: suggestion.lineName,
      moveUci: suggestion.moveUci,
    })),
    [
      { courseName: 'Another user A course', lineName: 'Alpha copy', moveUci: 'e2e4' },
      { courseName: 'Another user A course', lineName: 'Beta line', moveUci: 'd2d4' },
      { courseName: 'User A course', lineName: 'Alpha line', moveUci: 'e2e4' },
    ],
  );
  assert.equal(positionSuggestions.suggestions.some((suggestion) => suggestion.courseName === 'User B course'), false);

  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = {
      userId: userA.id,
      provider: 'dev',
      externalSubject: `course-owner-a-${suffix}`,
    };
  });
  await app.register(coursesModule);

  const positionSuggestionsResponse = await app.inject({
    method: 'GET',
    url: `/api/courses/position-suggestions?fen=${encodeURIComponent(positionFen)}`,
  });
  assert.equal(positionSuggestionsResponse.statusCode, 200);
  assert.deepEqual(
    coursePositionSuggestionsResponseSchema.parse(positionSuggestionsResponse.json()),
    positionSuggestions,
  );

  const chapterListResponse = await app.inject({
    method: 'GET',
    url: `/api/courses/${courseA.id}/chapters`,
  });
  assert.equal(chapterListResponse.statusCode, 200);
  assert.deepEqual(
    chapterListSchema.parse(chapterListResponse.json()),
    [serializeChapter(chapterA)],
  );

  const createChapterResponse = await app.inject({
    method: 'POST',
    url: `/api/courses/${courseA.id}/chapters`,
    payload: { name: 'HTTP-created chapter', description: null, sortOrder: 5 },
  });
  assert.equal(createChapterResponse.statusCode, 201);
  const createdChapter = chapterSchema.parse(createChapterResponse.json());
  assert.equal(createdChapter.courseId, courseA.id);
  assert.equal(createdChapter.name, 'HTTP-created chapter');
  assert.equal(createdChapter.description, null);
  assert.equal(createdChapter.sortOrder, 5);
  assert.equal(typeof createdChapter.createdAt, 'string');
  assert.equal(typeof createdChapter.updatedAt, 'string');

  const getChapterResponse = await app.inject({
    method: 'GET',
    url: `/api/chapters/${createdChapter.id}`,
  });
  assert.equal(getChapterResponse.statusCode, 200);
  assert.deepEqual(chapterSchema.parse(getChapterResponse.json()), createdChapter);

  const updateChapterResponse = await app.inject({
    method: 'PATCH',
    url: `/api/chapters/${createdChapter.id}`,
    payload: { name: 'HTTP-updated chapter', description: 'Updated over HTTP', sortOrder: 6 },
  });
  assert.equal(updateChapterResponse.statusCode, 200);
  const updatedChapter = chapterSchema.parse(updateChapterResponse.json());
  assert.equal(updatedChapter.id, createdChapter.id);
  assert.equal(updatedChapter.courseId, courseA.id);
  assert.equal(updatedChapter.name, 'HTTP-updated chapter');
  assert.equal(updatedChapter.description, 'Updated over HTTP');
  assert.equal(updatedChapter.sortOrder, 6);
  assert.equal(updatedChapter.createdAt, createdChapter.createdAt);

  assert.equal(await ChapterService.get(userA.id, chapterB.id), null);
  assert.equal(await ChapterService.list(userA.id, courseB.id), null);
  assert.equal(await LineService.get(userA.id, lineB.id), null);
  assert.equal(await LineService.list(userA.id, chapterB.id), null);
  assert.equal(await LineService.getMoveTree(userA.id, lineB.id), null);
  assert.equal(await MoveNodeService.update(userA.id, nodeB.id, { comment: 'Unauthorized' }), null);
  assert.equal(await MoveNodeService.deleteSubtree(userA.id, nodeB.id), null);
  assert.equal((await MoveNodeService.update(userB.id, nodeB.id, { comment: 'Owned' }))?.comment, 'Owned');

  console.log('Course ownership, chapter response, and position-suggestion response tests passed.');
} finally {
  if (app) await app.close();
  if (users.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: users } } });
  }
  await prisma.$disconnect();
}

function serializeChapter(chapter) {
  return {
    ...chapter,
    createdAt: chapter.createdAt.toISOString(),
    updatedAt: chapter.updatedAt.toISOString(),
  };
}
