import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const TEST_AUTH = { mode: 'dev-single-user', userId: 1 };

async function readDocument() {
  const app = await buildApp({ logger: false, authConfig: TEST_AUTH, prisma: { $disconnect: async () => {} } });
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
const redirectOperations = new Set([
  'GET /api/board-image',
  'GET /api/auth/lichess/callback',
]);

assert.ok(operations.every(({ operation }) => operation.operationId));
assert.ok(operations.every(({ operation }) => Array.isArray(operation.tags) && operation.tags.length > 0));
assert.ok(operations.every(({ operation }) => typeof operation.summary === 'string' && operation.summary.trim().length > 0));

for (const { method, path, operation } of operations) {
  const successfulStatuses = Object.keys(operation.responses ?? {}).filter((status) => /^2\d\d$/.test(status));
  if (redirectOperations.has(`${method.toUpperCase()} ${path}`)) {
    assert.deepEqual(Object.keys(operation.responses).filter((status) => /^3\d\d$/.test(status)), ['302']);
  } else {
    assert.ok(successfulStatuses.length > 0, `${method.toUpperCase()} ${path} must document a 2xx response`);
  }

  for (const variable of path.matchAll(/\{([^}]+)\}/g)) {
    const parameter = operation.parameters?.find((candidate) => candidate.in === 'path' && candidate.name === variable[1]);
    assert.ok(parameter, `${method.toUpperCase()} ${path} must document path parameter ${variable[1]}`);
    assert.equal(parameter.required, true, `${method.toUpperCase()} ${path} path parameter ${variable[1]} must be required`);
  }
}

const bodylessActions = new Map([
  ['POST /api/lines/{lineId}/training/start', 'the line id selects the repertoire material'],
  ['POST /api/training-marathons/{runId}/next', 'the run id selects the prepared marathon state'],
  ['POST /api/training/{sessionId}/complete', 'completion uses the persisted session state'],
  ['POST /api/training/{sessionId}/abandon', 'abandonment uses the persisted session state'],
  ['POST /api/imported-games/{gameId}/plies/analysis/clear', 'the imported game id fully identifies the analysis rows to clear'],
  ['POST /api/imported-games/{gameId}/tags/refresh', 'tags are recalculated from the persisted game and analysis'],
  ['POST /api/imported-games/{gameId}/full-refresh-runs', 'force re-indexes, assigns an opening, recalculates analysis, and refreshes tags'],
  ['POST /api/scenario-training/{sessionId}/complete', 'completion uses the persisted session attempt state'],
  ['POST /api/me/lichess-connection/start', 'creates an authorization URL for the authenticated user'],
  ['POST /api/me/accounts/{id}/sync', 'provider and cursor state come from the selected account'],
  ['POST /api/me/accounts/{id}/reset-cursor', 'resets the persisted cursor for the selected account'],
]);

for (const { method, path, operation } of operations.filter(({ method }) => ['post', 'patch', 'put'].includes(method))) {
  const key = `${method.toUpperCase()} ${path}`;
  if (bodylessActions.has(key)) {
    assert.equal(operation.requestBody, undefined, `${key} is intentionally bodyless`);
    assert.match(operation.description ?? '', new RegExp(bodylessActions.get(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } else {
    assert.ok(operation.requestBody, `${key} must document its request body or be explicitly allowlisted`);
  }
}

assert.deepEqual(
  operations.filter(({ method, operation }) => ['post', 'patch', 'put'].includes(method) && !operation.requestBody).map(({ method, path }) => `${method.toUpperCase()} ${path}`).sort(),
  [...bodylessActions.keys()].sort(),
  'the bodyless action allowlist must stay exact',
);

const operationIds = operations.map(({ operation }) => operation.operationId);
assert.equal(new Set(operationIds).size, operationIds.length, 'Operation IDs must be unique');
assert.equal(first.paths['/mcp'], undefined, 'MCP transport is not a product REST operation');
assert.equal(first.paths['/health'], undefined, 'Operational health endpoint is not part of the product contract');

console.log('OpenAPI convergence tests passed.');