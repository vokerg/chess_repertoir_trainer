export const analysisOpenApiSchemas = {
  AnalyzePositionRequest: {
    type: 'object',
    properties: {
      fen: { type: 'string' },
      depth: { type: 'integer', minimum: 1, maximum: 16, default: 12 },
      multipv: { type: 'integer', minimum: 1, maximum: 3, default: 3 },
    },
    required: ['fen'],
  },
  AnalyzePositionResponse: {
    type: 'object',
    properties: {
      position: { $ref: '#/components/schemas/PositionAnalysis' },
    },
    required: ['position'],
  },
  PositionAnalysis: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      cacheKey: { type: 'string' },
      fromCache: { type: 'boolean' },
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
      classification: { type: 'string', nullable: true },
      lines: { type: 'array', items: { type: 'object', additionalProperties: true } },
      playedLine: { type: 'object', nullable: true, additionalProperties: true },
    },
    required: ['id', 'cacheKey', 'fromCache', 'fen', 'normalizedFen', 'depth', 'multipv', 'engineName', 'classificationVersion', 'lines'],
  },
  AnalyzeImportedGameRequest: {
    type: 'object',
    properties: {
      depth: { type: 'integer', minimum: 1, maximum: 16, default: 12 },
      multipv: { type: 'integer', minimum: 1, maximum: 1, default: 1 },
      force: { type: 'boolean', default: false, description: 'When true, creates a new analysis run even if a matching QUEUED, RUNNING, or COMPLETED run already exists. PositionAnalysis cache is still reused.' },
      async: { type: 'boolean', default: true, description: 'When true, creates a QUEUED run for the analysis worker. When false, runs synchronously in the API process for local/dev fallback only.' },
    },
  },
  AnalyzeImportedGameResponse: {
    type: 'object',
    properties: {
      queued: { type: 'boolean', nullable: true },
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
      status: { type: 'string', enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'INTERRUPTED'] },
      depth: { type: 'integer' },
      multipv: { type: 'integer' },
      engineName: { type: 'string' },
      engineVersion: { type: 'string', nullable: true },
      positionsTotal: { type: 'integer' },
      positionsDone: { type: 'integer' },
      accuracyVersion: { type: 'string', nullable: true },
      whiteAccuracy: { type: 'number', nullable: true },
      blackAccuracy: { type: 'number', nullable: true },
      whiteAverageCentipawnLoss: { type: 'number', nullable: true },
      blackAverageCentipawnLoss: { type: 'number', nullable: true },
      whiteMovesAnalyzed: { type: 'integer' },
      blackMovesAnalyzed: { type: 'integer' },
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

export const analyzePositionOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Analyze one board position with backend Stockfish',
  description: 'Stores and reuses a pure position analysis row. This cached result is shared by opening analysis and imported-game analysis.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AnalyzePositionRequest' },
        examples: {
          startPosition: {
            value: {
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
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
      description: 'Cached or newly-created position analysis',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AnalyzePositionResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const getImportedGameAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Get latest saved analysis for one imported game',
  description: 'Returns the latest QUEUED, RUNNING, or COMPLETED imported-game analysis run as a compact report. Full engine lines remain stored in PositionAnalysis and are not returned by this endpoint.',
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
  summary: 'Queue or run imported-game Stockfish analysis',
  description: 'By default, creates a QUEUED analysis run that is picked up by the portable analysis worker. Passing async=false keeps the old synchronous API execution path for local/dev fallback only. If force is false and a QUEUED, RUNNING, or COMPLETED run already exists for the same game/depth/MultiPV/engine settings, that compact run is returned and no new run is created.',
  parameters: [importedGameIdParameter],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AnalyzeImportedGameRequest' },
        examples: {
          queueDefault: {
            value: {
              depth: 12,
              multipv: 1,
              force: false,
              async: true,
            },
          },
          synchronousFallback: {
            value: {
              depth: 12,
              multipv: 1,
              force: false,
              async: false,
            },
          },
          forceQueuedRerun: {
            value: {
              depth: 12,
              multipv: 1,
              force: true,
              async: true,
            },
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Existing queued, running, or completed analysis run was returned; no new run was created',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AnalyzeImportedGameResponse' },
        },
      },
    },
    '201': {
      description: 'New synchronous analysis run was created and completed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AnalyzeImportedGameResponse' },
        },
      },
    },
    '202': {
      description: 'New asynchronous analysis run was queued for the analysis worker',
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
