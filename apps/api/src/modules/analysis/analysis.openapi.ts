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
      run: { $ref: '#/components/schemas/GameAnalysisRun' },
    },
    required: ['reusedExisting', 'run'],
  },
  GameAnalysisRun: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      importedGameId: { type: 'integer' },
      status: { type: 'string', enum: ['RUNNING', 'COMPLETED', 'FAILED'] },
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
        items: { $ref: '#/components/schemas/GameMoveAnalysis' },
      },
    },
    required: ['id', 'importedGameId', 'status', 'depth', 'multipv', 'engineName', 'positionsTotal', 'positionsDone', 'startedAt', 'createdAt'],
  },
  GameMoveAnalysis: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      analysisRunId: { type: 'integer' },
      importedGameId: { type: 'integer' },
      positionAnalysisId: { type: 'integer' },
      plyNumber: { type: 'integer' },
      moveNumber: { type: 'integer' },
      side: { type: 'string', enum: ['WHITE', 'BLACK'] },
      fenBefore: { type: 'string' },
      fenAfter: { type: 'string', nullable: true },
      playedMoveUci: { type: 'string' },
      playedMoveSan: { type: 'string', nullable: true },
      classification: { type: 'string', enum: ['BEST', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER'], nullable: true },
      scoreLossCp: { type: 'integer', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      positionAnalysis: { $ref: '#/components/schemas/PositionAnalysis' },
    },
    required: ['id', 'analysisRunId', 'importedGameId', 'positionAnalysisId', 'plyNumber', 'moveNumber', 'side', 'fenBefore', 'playedMoveUci', 'createdAt'],
  },
  PositionAnalysis: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      fen: { type: 'string' },
      normalizedFen: { type: 'string' },
      playedMoveUci: { type: 'string', nullable: true },
      depth: { type: 'integer' },
      multipv: { type: 'integer' },
      engineName: { type: 'string' },
      engineVersion: { type: 'string', nullable: true },
      classificationVersion: { type: 'string' },
      bestMoveUci: { type: 'string', nullable: true },
      bestScoreCpWhite: { type: 'integer', nullable: true },
      playedScoreCpWhite: { type: 'integer', nullable: true },
      scoreLossCp: { type: 'integer', nullable: true },
      classification: { type: 'string', enum: ['BEST', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER'], nullable: true },
      lines: { type: 'array', nullable: true, items: { $ref: '#/components/schemas/EngineLine' } },
      playedLine: { $ref: '#/components/schemas/EngineLine' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'fen', 'normalizedFen', 'depth', 'multipv', 'engineName', 'classificationVersion', 'createdAt', 'updatedAt'],
  },
  EngineLine: {
    type: 'object',
    properties: {
      multipv: { type: 'integer' },
      depth: { type: 'integer' },
      moveUci: { type: 'string', nullable: true },
      scoreCpWhite: { type: 'integer', nullable: true },
      mateWhite: { type: 'integer', nullable: true },
      pvUci: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['multipv', 'depth', 'pvUci'],
  },
};

export const analyzeImportedGameOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Analyze one imported game with backend Stockfish',
  description: 'Synchronously analyzes the stored PGN for one imported game. If a RUNNING or COMPLETED run already exists for the same game/depth/MultiPV/engine settings, that run is returned and Stockfish is not executed again.',
  parameters: [
    {
      name: 'gameId',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
    },
  ],
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
