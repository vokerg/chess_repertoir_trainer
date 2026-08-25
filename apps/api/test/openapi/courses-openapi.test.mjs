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
  ['/api/lines/{id}', 'get', 'getLine'],
  ['/api/lines/{id}', 'patch', 'updateLine'],
  ['/api/lines/{id}/copy', 'post', 'copyLine'],
  ['/api/lines/{id}/tree', 'get', 'getLineTree'],
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

const lineTreeResponseSchema = responseSchema(first, '/api/lines/{id}/tree', 'get', '200');
assert.ok(lineTreeResponseSchema.properties?.root, 'Expected concrete move-tree root schema');
assert.notDeepEqual(lineTreeResponseSchema.properties.root, {}, 'Move-tree root must not be opaque');

console.log('Courses OpenAPI tests passed.');
