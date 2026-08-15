import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

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
    assert.equal(
      document.paths['/api/courses/position-suggestions'].get.operationId,
      'listCoursePositionSuggestions',
    );
    assert.equal(
      servedDocument.paths['/api/courses/position-suggestions'].get.operationId,
      'listCoursePositionSuggestions',
    );
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

const first = await generatedDocument();
const second = await generatedDocument();
assert.deepEqual(second, first);

const response = first.paths['/api/courses/position-suggestions'].get.responses['200'];
const responseSchema = resolveSchema(first, response.content['application/json'].schema);
assert.ok(responseSchema.properties?.normalizedFen);
const suggestionsSchema = resolveSchema(first, responseSchema.properties?.suggestions);
const suggestionSchema = resolveSchema(first, suggestionsSchema.items);
assert.ok(suggestionSchema.properties?.nodeId);
assert.ok(suggestionSchema.properties?.fenBefore);
assert.ok(suggestionSchema.properties?.moveUci);
assert.ok(suggestionSchema.properties?.courseName);

console.log('Courses OpenAPI tests passed.');
