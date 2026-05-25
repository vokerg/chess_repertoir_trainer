export const analysisOpenApiSchemas = {
  AnalyzeImportedGameRequest: {
    type: 'object',
    properties: {
      depth: { type: 'integer', minimum: 1, maximum: 16, default: 12 },
      multipv: { type: 'integer', minimum: 1, maximum: 3, default: 3 },
    },
  },
  AnalyzeImportedGameResponse: {
    type: 'object',
    properties: {
      reusedExisting: { type: 'boolean' },
      run: { $ref: '#/components/schemas/CompactGameAnalysisRun' },
    },
    required: ['reusedExisting', 'run'],
  },
  ImportedGameAnalysisResponse: {
    type: 'object',
    properties: {
      run: { $ref: '#/components/schemas/CompactGameAnalysisRun' },
    },
    required: ['run'],
  },
  CompactGameAnalysisRun: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      importedGameId: { type: 'integer' },
      status: { type: 'string', enum: ['RUNNING', 'COMPLETED'] },
      depth: { type: 'integer' },
      multipv: { type: 'integer' },
      engineName: { type: 'string' },
      engineVersion: { type: 'string', nullable: true },
      positionsTotal: { type: 'integer' },
      positionsDone: { type: 'integer' },
      summary: { type: 'object', nullable: true, additionalProperties: true },
      error: { type: 'string', nullable: true },
      startedAt: { type: 'string', format: 'date-time' },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      moves: {
        type: 'array',
        items: { $ref: '#/components/schemas/CompactGameMoveAnalysis' },
      },
      criticalMoves: {
        type: 'array',
        items: { $ref: '#/components/schemas/CompactGameMoveAnalysis' },
      },
    },
    required: ['id', 'importedGameId', 'status', 'depth', 'multipv', 'engineName', 'positionsTotal', 'positionsDone', 'startedAt', 'createdAt', 'moves', 'criticalMoves'],
  },
  CompactGameMoveAnalysis: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      plyNumber: { type: 'integer' },
      moveNumber: { type: 'integer' },
      side: { type: 'string', enum: ['WHITE', 'BLACK'] },
      playedMoveUci: { type: 'string' },
      playedMoveSan: { type: 'string', nullable: true },
      classification: { type: 'string', enum: ['BEST', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER'], nullable: true },
      scoreLossCp: { type: 'integer', nullable: true },
      bestMoveUci: { type: 'string', nullable: true },
      bestScoreCpWhite: { type: 'integer', nullable: true },
      playedScoreCpWhite: { type: 'integer', nullable: true },
      positionAnalysisId: { type: 'integer' },
    },
    required: ['id', 'plyNumber', 'moveNumber', 'side', 'playedMoveUci', 'positionAnalysisId'],
  },
};

const importedGameIdParameter = {
  name: 'gameId',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
};

export const getImportedGameAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Get latest saved analysis for one imported game',
  description: 'Returns the latest RUNNING or COMPLETED imported-game analysis run as a compact report. Full engine lines remain stored in PositionAnalysis and are not returned by this endpoint.',
  parameters: [importedGameIdParameter],
  responses: {
    '200': {
      description: 'Latest saved imported-game analysis',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ImportedGameAnalysisResponse' },
        },
      },
    },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};

export const analyzeImportedGameOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Analyze one imported game with backend Stockfish',
  description: 'Synchronously analyzes the stored PGN for one imported game. If a RUNNING or COMPLETED run already exists for the same game/depth/MultiPV/engine settings, that compact run is returned and Stockfish is not executed again.',
  parameters: [importedGameIdParameter],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AnalyzeImportedGameRequest' },
        examples: {
          default: {
            value: {
              depth: 12,
              multipv: 3,
            },
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Existing running or completed analysis run was returned; no re-analysis happened',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AnalyzeImportedGameResponse' },
        },
      },
    },
    '201': {
      description: 'New analysis run was created and completed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AnalyzeImportedGameResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};
