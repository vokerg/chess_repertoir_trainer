import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const courseOperations = [
  ['/api/courses/position-suggestions', 'get', 'listCoursePositionSuggestions'],
  ['/api/courses/{courseId}/chapters', 'get', 'listCourseChapters'],
  ['/api/courses/{courseId}/chapters', 'post', 'createCourseChapter'],
  ['/api/chapters/{id}', 'get', 'getChapter'],
  ['/api/chapters/{id}', 'patch', 'updateChapter'],
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

console.log('Courses OpenAPI tests passed.');
