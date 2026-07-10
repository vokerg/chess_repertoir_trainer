import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

async function readDocument() {
  const app = await buildApp({ logger: false });
  try {
    await app.ready();
    const generated = app.swagger();
    const response = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), generated);
    return generated;
  } finally {
    await app.close();
  }
}

const first = await readDocument();
const second = await readDocument();
assert.deepEqual(second, first, 'OpenAPI generation must be isolated per app instance');

const operations = Object.entries(first.paths).flatMap(([path, pathItem]) =>
  Object.entries(pathItem)
    .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
    .map(([method, operation]) => ({ method, path, operation })),
);

assert.ok(operations.length >= 90, 'The generated document must include the complete product route surface');
assert.ok(operations.every(({ operation }) => operation.operationId));
assert.ok(operations.every(({ operation }) => Array.isArray(operation.tags) && operation.tags.length > 0));

const operationIds = operations.map(({ operation }) => operation.operationId);
assert.equal(new Set(operationIds).size, operationIds.length, 'Operation IDs must be unique');
assert.equal(first.paths['/mcp'], undefined, 'MCP transport is not a product REST operation');
assert.equal(first.paths['/health'], undefined, 'Operational health endpoint is not part of the product contract');

console.log(`OpenAPI convergence tests passed (${operations.length} operations).`);
