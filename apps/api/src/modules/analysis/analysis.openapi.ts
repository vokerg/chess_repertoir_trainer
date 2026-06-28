export const analysisOpenApiSchemas = {
  StoredEngineLine: {
    type: 'object',
    properties: {
      multipv: { type: 'integer', minimum: 1, maximum: 3, nullable: true },
      depth: { type: 'integer', minimum: 0, nullable: true },
      moveUci: { type: 'string', nullable: true },
      scoreCpWhite: { type: 'integer', nullable: true },
      mateWhite: { type: 'integer', nullable: true },
      pvUci: { type: 'array', items: { type: 'string' } },
    },
    required: ['pvUci'],
  },
  PositionAnalysisLookupResponse: {
    type: 'object',
    properties: {
      positionAnalysis: { oneOf: [{ $ref: '#/components/schemas/PositionAnalysis' }, { type: 'null' }] },
    },
    required: ['positionAnalysis'],
  },
  BulkPositionAnalysisLookupRequest: {
    type: 'object',
    properties: {
      fens: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 1000,
      },
    },
    required: ['fens'],
  },
  BulkPositionAnalysisLookupResponse: {
    type: 'object',
    properties: {
      positionAnalyses: {
        type: 'array',
        items: { $ref: '#/components/schemas/PositionAnalysis' },
      },
    },
    required: ['positionAnalyses'],
  },
  StorePositionAnalysisRequest: {
    type: 'object',
    properties: {
      fen: { type: 'string' },
      bestMoveUci: { type: 'string', nullable: true },
      bestScoreCpWhite: { type: 'integer', nullable: true },
      bestMateWhite: { type: 'integer', nullable: true },
      lines: { type: 'array', items: { $ref: '#/components/schemas/StoredEngineLine' }, maxItems: 3 },
    },
    required: ['fen'],
  },
  BulkPositionAnalysisStoreRequest: {
    type: 'object',
    properties: {
      positions: {
        type: 'array',
        items: { $ref: '#/components/schemas/StorePositionAnalysisRequest' },
        minItems: 1,
        maxItems: 500,
      },
    },
    required: ['positions'],
  },
  PositionAnalysisStoreResponse: {
    type: 'object',
    properties: {
      positionAnalysis: { $ref: '#/components/schemas/PositionAnalysis' },
      position: { $ref: '#/components/schemas/PositionAnalysis' },
    },
    required: ['positionAnalysis'],
  },
  BulkPositionAnalysisStoreResponse: {
    type: 'object',
    properties: {
      positionAnalyses: {
        type: 'array',
        items: { $ref: '#/components/schemas/PositionAnalysis' },
      },
    },
    required: ['positionAnalyses'],
  },
  PositionAnalysis: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      positionId: { type: 'integer' },
      fen: { type: 'string', nullable: true },
      normalizedFen: { type: 'string' },
      fromCache: { type: 'boolean' },
      bestMoveUci: { type: 'string', nullable: true },
      bestScoreCpWhite: { type: 'integer', nullable: true },
      bestMateWhite: { type: 'integer', nullable: true },
      lines: { type: 'array', items: { $ref: '#/components/schemas/StoredEngineLine' } },
    },
    required: ['id', 'positionId', 'normalizedFen', 'fromCache', 'lines'],
  },
  ClientGameAnalysisRunRequest: {
    type: 'object',
    properties: {
      positionsDone: { type: 'integer', minimum: 0 },
      summary: { type: 'object', nullable: true, additionalProperties: true },
    },
  },
  ClientGameAnalysisRunResponse: {
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
      status: { type: 'string', enum: ['RUNNING', 'COMPLETED', 'FAILED'] },
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
        items: { $ref: '#/components/schemas/CompactGamePlyAnalysis' },
      },
      criticalMoves: {
        type: 'array',
        items: { $ref: '#/components/schemas/CompactGamePlyAnalysis' },
      },
    },
    required: ['id', 'importedGameId', 'status', 'positionsTotal', 'positionsDone', 'startedAt', 'createdAt', 'moves', 'criticalMoves'],
  },
  CompactGamePlyAnalysis: {
    type: 'object',
    properties: {
      plyNumber: { type: 'integer' },
      moveNumber: { type: 'integer' },
      side: { type: 'string', enum: ['WHITE', 'BLACK'] },
      playedMoveUci: { type: 'string' },
      playedMoveSan: { type: 'string', nullable: true },
      classificationCode: { type: 'integer', nullable: true },
      classification: { type: 'string' },
      scoreLossCp: { type: 'integer', nullable: true },
      bestMoveUci: { type: 'string', nullable: true },
      bestScoreCpWhite: { type: 'integer', nullable: true },
      bestMateWhite: { type: 'integer', nullable: true },
      positionAnalysisId: { type: 'integer', nullable: true },
    },
    required: ['plyNumber', 'moveNumber', 'side', 'playedMoveUci', 'classification'],
  },
  UpdatePlyAnalysisRequest: {
    type: 'object',
    properties: {
      plies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            plyNumber: { type: 'integer' },
            scoreLossCp: { type: 'integer', nullable: true },
            classificationCode: { type: 'integer', nullable: true, minimum: 1, maximum: 9 },
          },
          required: ['plyNumber', 'scoreLossCp', 'classificationCode'],
        },
        minItems: 1,
      },
    },
    required: ['plies'],
  },
  PlyAnalysisUpdateResponse: {
    type: 'object',
    properties: {
      importedGameId: { type: 'integer' },
      updatedPlies: { type: 'integer' },
    },
    required: ['importedGameId', 'updatedPlies'],
  },
  PlyAnalysisClearResponse: {
    type: 'object',
    properties: {
      importedGameId: { type: 'integer' },
      clearedPlies: { type: 'integer' },
    },
    required: ['importedGameId', 'clearedPlies'],
  },
};

const importedGameIdParameter = {
  name: 'gameId',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
};

export const getPositionAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Get cached position analysis',
  description: 'Returns cached client-computed analysis for a normalized position, or null. This endpoint never runs an engine.',
  parameters: [
    {
      name: 'fen',
      in: 'query',
      required: true,
      schema: { type: 'string' },
    },
  ],
  responses: {
    '200': {
      description: 'Cached position analysis or null',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PositionAnalysisLookupResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const bulkPositionAnalysisLookupOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Bulk lookup cached position analysis',
  description: 'Returns already-stored client-computed analysis rows for normalized positions. Missing positions are omitted and this endpoint never runs an engine.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/BulkPositionAnalysisLookupRequest' },
      },
    },
  },
  responses: {
    '200': {
      description: 'Cached position analyses that already exist',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/BulkPositionAnalysisLookupResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const storePositionAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Store one client-computed position analysis',
  description: 'Accepts completed engine lines computed on the client and stores them in the shared PositionAnalysis cache.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/StorePositionAnalysisRequest' },
      },
    },
  },
  responses: {
    '200': {
      description: 'Existing or newly upserted cached position analysis',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PositionAnalysisStoreResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const bulkStorePositionAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Store multiple client-computed position analyses',
  description: 'Accepts completed engine lines computed by a client or local engine and upserts them into the shared PositionAnalysis cache in bulk.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/BulkPositionAnalysisStoreRequest' },
      },
    },
  },
  responses: {
    '200': {
      description: 'Existing or newly upserted cached position analyses',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/BulkPositionAnalysisStoreResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const getImportedGameAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Get latest saved analysis summary for one imported game',
  description: 'Returns the latest saved client-side imported-game analysis summary and ply quality data.',
  parameters: [importedGameIdParameter],
  responses: {
    '200': {
      description: 'Latest saved imported-game analysis summary',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ImportedGameAnalysisResponse' },
        },
      },
    },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};

export const createClientGameAnalysisRunOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Create a client-side imported-game analysis summary',
  description: 'Records a summary/progress row after the browser has analyzed a game locally. This endpoint never runs an engine.',
  parameters: [importedGameIdParameter],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ClientGameAnalysisRunRequest' },
      },
    },
  },
  responses: {
    '201': {
      description: 'Client-side analysis summary was saved',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ClientGameAnalysisRunResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};

export const updatePlyAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Bulk update imported-game ply analysis',
  description: 'Stores client-computed centipawn loss and compact classification codes on existing imported-game ply rows.',
  parameters: [importedGameIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UpdatePlyAnalysisRequest' },
      },
    },
  },
  responses: {
    '200': {
      description: 'Ply analysis fields were updated',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlyAnalysisUpdateResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};

export const clearPlyAnalysisOpenApiOperation = {
  tags: ['Analysis'],
  summary: 'Clear imported-game ply analysis',
  description: 'Clears score loss and classification code fields for a game so the browser can re-analyze locally.',
  parameters: [importedGameIdParameter],
  responses: {
    '200': {
      description: 'Ply analysis fields were cleared',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlyAnalysisClearResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};
