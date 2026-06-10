import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isMcpEnabled, requireMcpAuth } from './mcp.auth';
import { createChessMcpServer } from './mcp.server';

function jsonRpcError(reply: FastifyReply, statusCode: number, code: number, message: string) {
  reply.code(statusCode);
  return {
    jsonrpc: '2.0',
    error: { code, message },
    id: null,
  };
}

function checkMcpAccess(request: FastifyRequest, reply: FastifyReply) {
  if (!isMcpEnabled()) {
    return jsonRpcError(reply, 404, -32000, 'MCP is not enabled');
  }
  if (!requireMcpAuth(request).ok) {
    return jsonRpcError(reply, 401, -32001, 'Unauthorized');
  }
  return null;
}

export default async function mcpModule(app: FastifyInstance) {
  app.post('/mcp', async (request, reply) => {
    const accessError = checkMcpAccess(request, reply);
    if (accessError) return accessError;

    const server = createChessMcpServer(app.log);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      reply.hijack();
      reply.raw.once('close', () => {
        void transport.close();
        void server.close();
      });
      await transport.handleRequest(request.raw, reply.raw, request.body);
      return reply;
    } catch (error) {
      app.log.error({ err: error }, 'Unexpected MCP transport failure');
      if (!reply.raw.headersSent) {
        reply.raw.statusCode = 500;
        reply.raw.setHeader('content-type', 'application/json');
        reply.raw.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }));
      }
      await transport.close();
      await server.close();
      return reply;
    }
  });

  app.get('/mcp', async (request, reply) => {
    const accessError = checkMcpAccess(request, reply);
    return accessError ?? jsonRpcError(reply, 405, -32000, 'Method not allowed');
  });

  app.delete('/mcp', async (request, reply) => {
    const accessError = checkMcpAccess(request, reply);
    return accessError ?? jsonRpcError(reply, 405, -32000, 'Method not allowed');
  });
}
