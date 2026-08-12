import assert from 'node:assert/strict';
import {
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

console.log('Course management contract tests passed.');
