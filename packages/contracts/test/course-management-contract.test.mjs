import assert from 'node:assert/strict';
import {
  analysisReintegrationApplyErrorResponseSchema,
  analysisReintegrationApplyResponseSchema,
  analysisReintegrationPreviewResponseSchema,
  chapterListSchema,
  chapterSchema,
  coursePositionSuggestionsResponseSchema,
  courseSchema,
  createCourseSchema,
  lineListSchema,
  lineMoveNodeSchema,
  lineMoveTreeSchema,
  lineSchema,
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

const line = {
  id: 14,
  chapterId: chapter.id,
  name: 'Main line',
  sideToTrain: 'WHITE',
  startingFen: 'startpos',
  tags: '["gambit","main"]',
  notes: null,
  createdAt: '2026-08-12T12:15:00.000Z',
  updatedAt: '2026-08-12T12:20:00.000Z',
};
assert.deepEqual(lineSchema.parse(line), line);
assert.equal(lineSchema.safeParse({ ...line, sideToTrain: 'RED' }).success, false);
assert.equal(lineSchema.safeParse({ ...line, tags: ['gambit'] }).success, false);
assert.equal(lineSchema.safeParse({ ...line, createdAt: new Date(line.createdAt) }).success, false);

const lineListItem = {
  ...line,
  trainingStats: {
    totalAttempts: 3,
    passedCount: 2,
    failedCount: 1,
    passRate: 2 / 3,
    activeSublineCount: 2,
    trainedSublineCount: 1,
    untrainedSublineCount: 1,
    weakSublineCount: 0,
    status: 'REVIEW',
  },
};
assert.deepEqual(lineListSchema.parse([lineListItem]), [lineListItem]);
assert.equal(lineListSchema.safeParse([{ ...lineListItem, trainingStats: { ...lineListItem.trainingStats, passRate: 1.1 } }]).success, false);
assert.equal(lineListSchema.safeParse([{ ...lineListItem, trainingStats: { ...lineListItem.trainingStats, status: 'UNKNOWN' } }]).success, false);

const rootNode = {
  id: 0,
  lineId: line.id,
  parentId: null,
  plyNumber: 0,
  fenBefore: 'startpos',
  fenAfter: 'startpos',
  moveUci: '',
  moveSan: '',
  moveNumber: 0,
  colorToMoveBefore: 'WHITE',
  side: 'WHITE',
  isUserMove: false,
  isCorrectUserMove: false,
  sortOrder: 0,
  createdAt: '2026-08-12T12:25:00.000Z',
  updatedAt: '2026-08-12T12:25:00.000Z',
};
const childNode = {
  id: 31,
  lineId: line.id,
  parentId: null,
  plyNumber: 1,
  fenBefore: 'startpos',
  fenBeforeNormalized: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
  fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  moveUci: 'e2e4',
  moveSan: 'e4',
  moveNumber: 1,
  colorToMoveBefore: 'WHITE',
  side: 'WHITE',
  isUserMove: true,
  isCorrectUserMove: true,
  comment: null,
  annotation: null,
  branchLabel: null,
  branchWeight: null,
  sortOrder: 0,
  createdAt: '2026-08-12T12:26:00.000Z',
  updatedAt: '2026-08-12T12:26:00.000Z',
};
assert.deepEqual(lineMoveNodeSchema.parse(childNode), childNode);
assert.equal(lineMoveNodeSchema.safeParse({ ...childNode, side: 'RED' }).success, false);
assert.equal(lineMoveNodeSchema.safeParse({ ...childNode, createdAt: new Date(childNode.createdAt) }).success, false);
assert.equal(lineMoveNodeSchema.safeParse({ ...childNode, parentId: 0 }).success, false);

const lineTree = {
  root: {
    node: rootNode,
    children: [{ node: childNode, children: [] }],
  },
};
assert.deepEqual(lineMoveTreeSchema.parse(lineTree), lineTree);
assert.equal(lineMoveTreeSchema.safeParse({
  root: {
    ...lineTree.root,
    children: [{ node: { ...childNode, createdAt: new Date(childNode.createdAt) }, children: [] }],
  },
}).success, false);
assert.equal(lineMoveTreeSchema.safeParse({
  root: {
    ...lineTree.root,
    children: [{ node: { ...childNode, parentId: 0 }, children: [] }],
  },
}).success, false);
assert.equal(lineMoveTreeSchema.safeParse({
  root: { ...lineTree.root, node: { ...rootNode, id: 1 } },
}).success, false);
assert.equal(lineMoveTreeSchema.safeParse({
  root: {
    ...lineTree.root,
    children: [{ node: { ...childNode, id: 0 }, children: [] }],
  },
}).success, false);
assert.equal(lineMoveTreeSchema.safeParse({
  root: {
    ...lineTree.root,
    children: [{ node: { ...childNode, moveUci: '' }, children: [] }],
  },
}).success, false);

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

const reintegrationPreviewMove = {
  moveUci: 'e2e4',
  moveSan: 'e4',
  fenBefore: 'startpos',
  fenAfter: 'after-e4',
  normalizedFenBefore: 'normalized-start',
  status: 'CONFLICT',
  existingNodeId: null,
  reason: 'Different trained-side move already exists in this course.',
  children: [],
};
const reintegrationConflict = {
  normalizedFenBefore: 'normalized-start',
  sideToMove: 'WHITE',
  proposedMoveUci: 'e2e4',
  proposedMoveSan: 'e4',
  existingMoves: [{
    moveUci: 'd2d4',
    moveSan: 'd4',
    lineRefs: [{ lineId: 14, lineName: 'Main line', nodeId: 31, moveSequenceSan: '1. d4' }],
  }],
};
const reintegrationCounts = {
  reusedMoves: 0,
  createdMoves: 0,
  conflictingMoves: 1,
  totalAnalysisMoves: 1,
};
const reintegrationPreview = {
  analysisRootFen: 'startpos',
  analysisRootNormalizedFen: 'normalized-start',
  candidates: [{
    lineId: 14,
    lineName: 'Main line',
    sideToTrain: 'WHITE',
    anchor: {
      kind: 'LINE_START',
      lineId: 14,
      lineName: 'Main line',
      nodeId: null,
      fen: 'startpos',
      normalizedFen: 'normalized-start',
      moveSequenceSan: null,
    },
    counts: reintegrationCounts,
    conflicts: [reintegrationConflict],
    warnings: [],
    previewTree: [reintegrationPreviewMove],
  }],
  newLine: {
    allowed: false,
    counts: reintegrationCounts,
    conflicts: [reintegrationConflict],
    warnings: [],
    previewTree: [reintegrationPreviewMove],
  },
};
assert.deepEqual(analysisReintegrationPreviewResponseSchema.parse(reintegrationPreview), reintegrationPreview);
assert.equal(analysisReintegrationPreviewResponseSchema.safeParse({
  ...reintegrationPreview,
  newLine: { ...reintegrationPreview.newLine, previewTree: undefined },
}).success, false);

const reintegrationApply = {
  targetKind: 'EXISTING_LINE',
  lineId: 14,
  lineName: 'Main line',
  createdMoves: 1,
  reusedMoves: 0,
};
assert.deepEqual(analysisReintegrationApplyResponseSchema.parse(reintegrationApply), reintegrationApply);
assert.equal(analysisReintegrationApplyResponseSchema.safeParse({ ...reintegrationApply, createdMoves: -1 }).success, false);
assert.deepEqual(analysisReintegrationApplyErrorResponseSchema.parse({
  error: 'Analysis tree has repertoire conflicts.',
  conflicts: [reintegrationConflict],
}), {
  error: 'Analysis tree has repertoire conflicts.',
  conflicts: [reintegrationConflict],
});
assert.equal(analysisReintegrationApplyErrorResponseSchema.safeParse({
  error: 'Analysis tree has repertoire conflicts.',
  conflicts: [{ proposedMoveUci: 'e2e4' }],
}).success, false);

console.log('Course management contract tests passed.');
