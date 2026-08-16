import assert from 'node:assert/strict';
import {
  chapterListSchema,
  chapterSchema,
  coursePositionSuggestionsResponseSchema,
  courseSchema,
  createCourseSchema,
  updateCourseSchema,
} from '../dist/courses/index.js';

assert.deepEqual(createCourseSchema.parse({ name: 'Italian Game' }), {
  name: 'Italian Game',
  side: 'WHITE',
});

assert.deepEqual(createCourseSchema.parse({
  name: 'Sicilian',
  description: null,
  side: 'BLACK',
  coverKey: 'SICILIAN',
}), {
  name: 'Sicilian',
  description: null,
  side: 'BLACK',
  coverKey: 'SICILIAN',
});

assert.equal(createCourseSchema.safeParse({
  name: 'Broken cover',
  side: 'WHITE',
  coverKey: 'NOT_A_COVER',
}).success, false);

assert.deepEqual(updateCourseSchema.parse({ coverKey: null }), { coverKey: null });

const course = {
  id: 21,
  userId: 7,
  name: 'Queen’s Gambit',
  description: 'A White repertoire',
  side: 'WHITE',
  coverKey: 'QUEENS_GAMBIT',
  contentRevision: 3,
  contentChangedAt: '2026-08-12T12:00:00.000Z',
  createdAt: '2026-08-12T12:00:00.000Z',
  updatedAt: '2026-08-12T12:00:00.000Z',
};
assert.deepEqual(courseSchema.parse(course), course);

const chapter = {
  id: 8,
  courseId: course.id,
  name: 'Accepted Queen’s Gambit',
  description: null,
  sortOrder: 2,
  createdAt: '2026-08-12T12:05:00.000Z',
  updatedAt: '2026-08-12T12:10:00.000Z',
};
assert.deepEqual(chapterSchema.parse(chapter), chapter);
assert.deepEqual(chapterListSchema.parse([chapter]), [chapter]);
assert.equal(chapterSchema.safeParse({ ...chapter, createdAt: new Date(chapter.createdAt) }).success, false);
assert.equal(chapterSchema.safeParse({ ...chapter, sortOrder: 2.5 }).success, false);
assert.equal(chapterSchema.safeParse({ ...chapter, description: undefined }).success, false);

const positionSuggestions = {
  normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
  suggestions: [{
    nodeId: 31,
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    moveUci: 'e2e4',
    moveSan: 'e4',
    isUserMove: true,
    isCorrectUserMove: true,
    sortOrder: 0,
    lineId: 11,
    lineName: 'Main line',
    chapterId: 7,
    chapterName: 'Open Games',
    chapterSortOrder: 2,
    courseId: 3,
    courseName: 'White repertoire',
  }],
};
assert.deepEqual(coursePositionSuggestionsResponseSchema.parse(positionSuggestions), positionSuggestions);
assert.equal(coursePositionSuggestionsResponseSchema.safeParse({
  ...positionSuggestions,
  suggestions: [{ ...positionSuggestions.suggestions[0], courseId: '3' }],
}).success, false);

console.log('Course management contract tests passed.');
