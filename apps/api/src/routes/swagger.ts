import { FastifyInstance, FastifyReply } from 'fastify';
import { getGeneratedOpenApiPaths, getGeneratedOpenApiSchemas } from '../openapi/route-registry';

const legacyOpenApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Chess Repertoire Trainer API',
    version: '0.1.0',
    description: 'Backend API for repertoire authoring, training, external game imports, and analysis.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local API server',
    },
  ],
  tags: [
    { name: 'System' },
    { name: 'Current user' },
    { name: 'External accounts' },
    { name: 'Imported games' },
    { name: 'Analysis' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean' } },
                  required: ['ok'],
                },
              },
            },
          },
        },
      },
    },
    '/api/me': {
      get: {
        tags: ['Current user'],
        summary: 'Get or create the singleton local user',
        responses: {
          '200': {
            description: 'Current singleton user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AppUser' },
              },
            },
          },
        },
      },
    },
    '/api/me/accounts': {
      get: {
        tags: ['External accounts'],
        summary: 'List external chess accounts for the singleton user',
        responses: {
          '200': {
            description: 'External accounts',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ExternalAccount' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['External accounts'],
        summary: 'Add or reactivate an external chess account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateExternalAccountRequest' },
              examples: {
                lichess: { value: { provider: 'LICHESS', username: 'someLichessUser' } },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created or reactivated external account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExternalAccount' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/me/accounts/{id}': {
      get: {
        tags: ['External accounts'],
        summary: 'Get one external chess account',
        parameters: [{ $ref: '#/components/parameters/AccountId' }],
        responses: {
          '200': {
            description: 'External account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExternalAccount' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['External accounts'],
        summary: 'Update external account metadata',
        parameters: [{ $ref: '#/components/parameters/AccountId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateExternalAccountRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated external account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExternalAccount' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/me/accounts/{id}/sync': {
      post: {
        tags: ['External accounts'],
        summary: 'Synchronize games for an external account',
        description: 'Currently implemented for Lichess accounts only. The sync is synchronous and uses cursor + overlap + upsert behavior.',
        parameters: [{ $ref: '#/components/parameters/AccountId' }],
        responses: {
          '200': {
            description: 'Import run summary',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImportRunSummary' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/me/accounts/{id}/games': {
      get: {
        tags: ['Imported games'],
        summary: 'List imported games for an external account',
        parameters: [
          { $ref: '#/components/parameters/AccountId' },
          { name: 'take', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
          { name: 'skip', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Imported games',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ImportedGame' } },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    parameters: {
      AccountId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MessageResponse' },
          },
        },
      },
    },
    schemas: {
      AppUser: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          displayName: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'createdAt', 'updatedAt'],
      },
      ExternalAccount: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          provider: { type: 'string', enum: ['LICHESS', 'CHESS_COM'] },
          username: { type: 'string' },
          displayName: { type: 'string', nullable: true },
          providerUserId: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
          syncCursorTime: { type: 'string', format: 'date-time', nullable: true },
          lastSyncRunId: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'userId', 'provider', 'username', 'isActive', 'createdAt', 'updatedAt'],
      },
      ImportedGame: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          accountId: { type: 'integer' },
          provider: { type: 'string' },
          providerGameId: { type: 'string' },
          providerUrl: { type: 'string', nullable: true },
          pgn: { type: 'string', nullable: true },
          rawJson: { type: 'object', nullable: true, additionalProperties: true },
          rated: { type: 'boolean', nullable: true },
          variant: { type: 'string', nullable: true },
          speedCategory: { type: 'string', nullable: true },
          timeControlRaw: { type: 'string', nullable: true },
          timeControlInitial: { type: 'integer', nullable: true },
          timeControlIncrement: { type: 'integer', nullable: true },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          endedAt: { type: 'string', format: 'date-time', nullable: true },
          whiteUsername: { type: 'string', nullable: true },
          blackUsername: { type: 'string', nullable: true },
          whiteRating: { type: 'integer', nullable: true },
          blackRating: { type: 'integer', nullable: true },
          userColor: { type: 'string', enum: ['WHITE', 'BLACK'], nullable: true },
          opponentUsername: { type: 'string', nullable: true },
          result: { type: 'string', nullable: true },
          resultForUser: { type: 'string', enum: ['WIN', 'LOSS', 'DRAW'], nullable: true },
          status: { type: 'string', nullable: true },
          openingName: { type: 'string', nullable: true },
          openingEco: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'userId', 'accountId', 'provider', 'providerGameId', 'createdAt', 'updatedAt'],
      },
      CreateExternalAccountRequest: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['LICHESS', 'CHESS_COM'] },
          username: { type: 'string', minLength: 1 },
          displayName: { type: 'string', minLength: 1 },
        },
        required: ['provider', 'username'],
      },
      UpdateExternalAccountRequest: {
        type: 'object',
        properties: {
          displayName: { type: 'string', minLength: 1, nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      ImportRunSummary: {
        type: 'object',
        properties: {
          importRunId: { type: 'integer' },
          status: { type: 'string' },
          gamesSeen: { type: 'integer' },
          gamesImported: { type: 'integer' },
          gamesUpdated: { type: 'integer' },
          gamesFailed: { type: 'integer' },
          syncSince: { type: 'string', format: 'date-time', nullable: true },
          syncUntil: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['importRunId', 'status', 'gamesSeen', 'gamesImported', 'gamesUpdated', 'gamesFailed'],
      },
      ErrorResponse: {
        type: 'object',
        properties: { error: {} },
      },
      MessageResponse: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
    },
  },
};

function buildOpenApiDocument() {
  const generatedSchemas = getGeneratedOpenApiSchemas();
  const generatedPaths = getGeneratedOpenApiPaths();

  return {
    ...legacyOpenApiDocument,
    paths: {
      ...legacyOpenApiDocument.paths,
      ...generatedPaths,
    },
    components: {
      ...legacyOpenApiDocument.components,
      schemas: {
        ...legacyOpenApiDocument.components.schemas,
        ...generatedSchemas,
      },
    },
  };
}

function swaggerHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chess Repertoire Trainer API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api/docs/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`;
}

export default async function swaggerRoutes(app: FastifyInstance) {
  app.get('/api/docs/openapi.json', async () => buildOpenApiDocument());

  app.get('/api/docs', async (_request, reply: FastifyReply) => {
    reply.type('text/html');
    return swaggerHtml();
  });
}
