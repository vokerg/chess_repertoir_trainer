import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const courseOperations = [
  ['/api/courses/position-suggestions', 'get', 'listCoursePositionSuggestions'],
  ['/api/courses/{courseId}/chapters', 'get', 'listCourseChapters'],
  ['/api/courses/{courseId}/chapters', 'post', 'createCourseChapter'],
  ['/api/chapters/{id}', 'get', 'getChapter'],
  ['/api/chapters/{id}', 'patch', 'updateChapter'],
  ['/api/chapters/{chapterId}/lines', 'get', 'listChapterLines'],
  ['/api/chapters/{chapterId}/lines', 'post', 'createChapterLine'],
  ['/api/chapters/{chapterId}/lines/import-pgn', 'post', 'importChapterLinePgn'],
  ['/api/chapters/{chapterId}/analysis-reintegration/preview', 'post', 'previewChapterAnalysisReintegration'],
  ['/api/chapters/{chapterId}/analysis-reintegration/apply', 'post', 'applyChapterAnalysisReintegration'],
  ['/api/lines/{id}', 'get', 'getLine'],
  ['/api/lines/{id}', 'patch', 'updateLine'],
  ['/api/lines/{id}/copy', 'post', 'copyLine'],
  ['/api/lines/{id}/tree', 'get', 'getLineTree'],
  ['/api/lines/{lineId}/nodes', 'post', 'createLineNode'],
  ['/api/nodes/{id}', 'patch', 'updateMoveNode'],
];

async function generatedDocument() {
  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: 1 },
    prisma: { $disconnect: async () => {} },
  });
  try {
    await app.ready();
    const document = app.swagger();
    const served = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });
    assert.equal(served.statusCode, 200);
    const servedDocument = served.json();
    for (const [path, method, operationId] of courseOperations) {
      assert.equal(document.paths[path][method].operationId, operationId);
      assert.equal(servedDocument.paths[path][method].operationId, operationId);
    }
    return document;
  } finally {
    await app.close();
  }
}

function resolveSchema(document, schema) {
  if (!schema?.$ref) return schema;
  return schema.$ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((value, segment) => value?.[segment], document);
}

function responseSchema(document, path, method, status) {
  const response = document.paths[path][method].responses[status];
  return resolveSchema(document, response.content['application/json'].schema);
}

function assertChapterSchema(document, schema) {
  const resolved = resolveSchema(document, schema);
  for (const property of ['id', 'courseId', 'name', 'description', 'sortOrder', 'createdAt', 'updatedAt']) {
    assert.ok(resolved.properties?.[property], `Expected chapter property ${property}`);
  }
  assert.equal(resolved.properties.createdAt.format, 'date-time');
  assert.equal(resolved.properties.updatedAt.format, 'date-time');
}

function assertLineSchema(document, schema) {
  const resolved = resolveSchema(document, schema);
  for (const property of [
    'id',
    'chapterId',
    'name',
    'sideToTrain',
    'startingFen',
    'tags',
    'notes',
    'createdAt',
    'updatedAt',
  ]) {
    assert.ok(resolved.properties?.[property], `Expected line property ${property}`);
  }
  assert.equal(resolved.properties.createdAt.format, 'date-time');
  assert.equal(resolved.properties.updatedAt.format, 'date-time');
}

function assertLineMoveNodeSchema(document, schema) {
  const node = resolveSchema(document, schema);
  for (const property of [
    'id',
    'lineId',
    'parentId',
    'plyNumber',
    'fenBefore',
    'fenBeforeNormalized',
    'fenAfter',
    'moveUci',
    'moveSan',
    'moveNumber',
    'colorToMoveBefore',
    'side',
    'isUserMove',
    'isCorrectUserMove',
    'comment',
    'annotation',
    'branchLabel',
    'branchWeight',
    'sortOrder',
    'createdAt',
    'updatedAt',
  ]) {
    assert.ok(node.properties?.[property], `Expected move-node property ${property}`);
  }
  assert.equal(node.properties.createdAt.format, 'date-time');
  assert.equal(node.properties.updatedAt.format, 'date-time');
  return node;
}

function assertMoveTreeNodeSchema(document, schema) {
  const treeNode = resolveSchema(document, schema);
  assert.ok(treeNode, `Expected resolvable move-tree schema reference ${schema?.$ref ?? '<inline>'}`);
  assert.ok(treeNode.properties?.node, 'Expected move-tree node payload');
  assert.ok(treeNode.properties?.children, 'Expected recursive move-tree children');

  const node = assertLineMoveNodeSchema(document, treeNode.properties.node);
  const children = resolveSchema(document, treeNode.properties.children);
  assert.equal(children.type, 'array');
  assert.ok(children.items, 'Expected recursive move-tree child item schema');
  return { treeNode, node, children };
}

const first = await generatedDocument();
const second = await generatedDocument();
assert.deepEqual(second, first);

const positionResponseSchema = responseSchema(first, '/api/courses/position-suggestions', 'get', '200');
assert.ok(positionResponseSchema.properties?.normalizedFen);
const suggestionsSchema = resolveSchema(first, positionResponseSchema.properties?.suggestions);
const suggestionSchema = resolveSchema(first, suggestionsSchema.items);
assert.ok(suggestionSchema.properties?.nodeId);
assert.ok(suggestionSchema.properties?.fenBefore);
assert.ok(suggestionSchema.properties?.moveUci);
assert.ok(suggestionSchema.properties?.courseName);

const chapterListResponseSchema = responseSchema(first, '/api/courses/{courseId}/chapters', 'get', '200');
assert.equal(chapterListResponseSchema.type, 'array');
assertChapterSchema(first, chapterListResponseSchema.items);
assertChapterSchema(first, responseSchema(first, '/api/courses/{courseId}/chapters', 'post', '201'));
assertChapterSchema(first, responseSchema(first, '/api/chapters/{id}', 'get', '200'));
assertChapterSchema(first, responseSchema(first, '/api/chapters/{id}', 'patch', '200'));

const lineListResponseSchema = responseSchema(first, '/api/chapters/{chapterId}/lines', 'get', '200');
assert.equal(lineListResponseSchema.type, 'array');
assertLineSchema(first, lineListResponseSchema.items);
const lineListItemSchema = resolveSchema(first, lineListResponseSchema.items);
const trainingStatsSchema = resolveSchema(first, lineListItemSchema.properties?.trainingStats);
for (const property of ['totalAttempts', 'passRate', 'activeSublineCount', 'status']) {
  assert.ok(trainingStatsSchema.properties?.[property], `Expected line training-stats property ${property}`);
}

assertLineSchema(first, responseSchema(first, '/api/chapters/{chapterId}/lines', 'post', '201'));
assertLineSchema(first, responseSchema(first, '/api/chapters/{chapterId}/lines/import-pgn', 'post', '201'));
assertLineSchema(first, responseSchema(first, '/api/lines/{id}', 'get', '200'));
assertLineSchema(first, responseSchema(first, '/api/lines/{id}', 'patch', '200'));
assertLineSchema(first, responseSchema(first, '/api/lines/{id}/copy', 'post', '201'));

const reintegrationPreviewSchema = responseSchema(
  first,
  '/api/chapters/{chapterId}/analysis-reintegration/preview',
  'post',
  '200',
);
for (const property of ['analysisRootFen', 'analysisRootNormalizedFen', 'candidates', 'newLine']) {
  assert.ok(reintegrationPreviewSchema.properties?.[property], `Expected reintegration preview property ${property}`);
}
const reintegrationCandidates = resolveSchema(first, reintegrationPreviewSchema.properties.candidates);
assert.equal(reintegrationCandidates.type, 'array');
const reintegrationCandidate = resolveSchema(first, reintegrationCandidates.items);
for (const property of ['lineId', 'anchor', 'counts', 'conflicts', 'warnings', 'previewTree']) {
  assert.ok(reintegrationCandidate.properties?.[property], `Expected reintegration candidate property ${property}`);
}
const newLinePreview = resolveSchema(first, reintegrationPreviewSchema.properties.newLine);
assert.ok(newLinePreview.properties?.previewTree, 'Expected new-line reintegration preview tree');

const reintegrationApplySchema = responseSchema(
  first,
  '/api/chapters/{chapterId}/analysis-reintegration/apply',
  'post',
  '200',
);
for (const property of ['targetKind', 'lineId', 'lineName', 'createdMoves', 'reusedMoves']) {
  assert.ok(reintegrationApplySchema.properties?.[property], `Expected reintegration apply property ${property}`);
}
const reintegrationConflictErrorSchema = responseSchema(
  first,
  '/api/chapters/{chapterId}/analysis-reintegration/apply',
  'post',
  '409',
);
assert.ok(reintegrationConflictErrorSchema.properties?.error, 'Expected reintegration error message');
assert.ok(reintegrationConflictErrorSchema.properties?.conflicts, 'Expected optional reintegration conflict details');

const lineTreeResponseSchema = responseSchema(first, '/api/lines/{id}/tree', 'get', '200');
const root = assertMoveTreeNodeSchema(first, lineTreeResponseSchema.properties?.root);
const child = assertMoveTreeNodeSchema(first, root.children.items);
assert.ok(child.node.properties?.fenBeforeNormalized, 'Expected persisted move-node normalized FEN field');
assert.ok(child.children.items?.$ref, 'Expected recursive descendants to use a schema reference');
assert.ok(resolveSchema(first, child.children.items), 'Expected recursive descendant reference to resolve');

assertLineMoveNodeSchema(first, responseSchema(first, '/api/lines/{lineId}/nodes', 'post', '201'));
assertLineMoveNodeSchema(first, responseSchema(first, '/api/nodes/{id}', 'patch', '200'));

console.log('Courses OpenAPI tests passed.');
