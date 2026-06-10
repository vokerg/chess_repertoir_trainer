import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import mcpModule from '../../dist/modules/mcp/mcp.routes.js';

const originalEnabled = process.env.MCP_ENABLED;
const originalAuthMode = process.env.MCP_AUTH_MODE;
const originalToken = process.env.MCP_BEARER_TOKEN;
const app = Fastify({ logger: false });

try {
  await app.register(mcpModule);

  process.env.MCP_ENABLED = 'false';
  const disabled = await app.inject({ method: 'POST', url: '/mcp', payload: {} });
  assert.equal(disabled.statusCode, 404);

  process.env.MCP_ENABLED = 'true';
  process.env.MCP_AUTH_MODE = 'token';
  process.env.MCP_BEARER_TOKEN = 'test-secret';
  const unauthorized = await app.inject({
    method: 'POST',
    url: '/mcp',
    headers: { authorization: 'Bearer incorrect' },
    payload: {},
  });
  assert.equal(unauthorized.statusCode, 401);

  delete process.env.MCP_BEARER_TOKEN;
  const missingToken = await app.inject({ method: 'POST', url: '/mcp', payload: {} });
  assert.equal(missingToken.statusCode, 401);

  process.env.MCP_AUTH_MODE = 'none';
  const noAuthGet = await app.inject({ method: 'GET', url: '/mcp' });
  assert.equal(noAuthGet.statusCode, 405);

  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  const client = new Client({ name: 'mcp-transport-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL('/mcp', address));

  await client.connect(transport);
  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, [
    'get_imported_game',
    'get_imported_game_analysis',
    'get_imported_game_facets',
    'get_imported_game_pgn',
    'get_opening_analysis',
    'search_imported_games',
  ]);
  assert.ok(tools.tools.every((tool) => tool.annotations?.readOnlyHint === true));
  await client.close();

  console.log('MCP transport tests passed');
} finally {
  await app.close();
  if (originalEnabled === undefined) delete process.env.MCP_ENABLED;
  else process.env.MCP_ENABLED = originalEnabled;
  if (originalAuthMode === undefined) delete process.env.MCP_AUTH_MODE;
  else process.env.MCP_AUTH_MODE = originalAuthMode;
  if (originalToken === undefined) delete process.env.MCP_BEARER_TOKEN;
  else process.env.MCP_BEARER_TOKEN = originalToken;
}
