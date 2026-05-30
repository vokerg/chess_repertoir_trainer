export const importedGamesOpenApiSchemas = {
  ImportedGameSearchResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/ImportedGameListItem' } },
      pageInfo: { $ref: '#/components/schemas/CursorPageInfo' },
      appliedFilters: { type: 'object', additionalProperties: true },
    },
    required: ['items', 'pageInfo', 'appliedFilters'],
  },
  CursorPageInfo: {
    type: 'object',
    properties: {
      nextCursor: { type: 'string', nullable: true },
      hasMore: { type: 'boolean' },
    },
    required: ['nextCursor', 'hasMore'],
  },
  ImportedGameListItem: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      accountId: { type: 'integer' },
      provider: { type: 'string', enum: ['LICHESS', 'CHESS_COM'] },
      providerGameId: { type: 'string' },
      providerUrl: { type: 'string', nullable: true },
      endedAt: { type: 'string', format: 'date-time', nullable: true },
      startedAt: { type: 'string', format: 'date-time', nullable: true },
      speedCategory: { type: 'string', nullable: true },
      rated: { type: 'boolean', nullable: true },
      variant: { type: 'string', nullable: true },
      timeControl: {
        type: 'object',
        properties: {
          raw: { type: 'string', nullable: true },
          initial: { type: 'integer', nullable: true },
          increment: { type: 'integer', nullable: true },
        },
      },
      white: { $ref: '#/components/schemas/ImportedGamePlayer' },
      black: { $ref: '#/components/schemas/ImportedGamePlayer' },
      userColor: { type: 'string', enum: ['WHITE', 'BLACK'], nullable: true },
      opponentUsername: { type: 'string', nullable: true },
      result: { type: 'string', nullable: true },
      resultForUser: { type: 'string', enum: ['WIN', 'DRAW', 'LOSS'], nullable: true },
      status: { type: 'string', nullable: true },
      opening: { $ref: '#/components/schemas/ImportedGameOpening' },
      analysis: { $ref: '#/components/schemas/ImportedGameAnalysisSummary' },
    },
    required: ['id', 'accountId', 'provider', 'providerGameId', 'timeControl', 'white', 'black', 'opening', 'analysis'],
  },
  ImportedGameDetail: {
    allOf: [
      { $ref: '#/components/schemas/ImportedGameListItem' },
      {
        type: 'object',
        properties: {
          pgn: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  ImportedGamePlayer: {
    type: 'object',
    properties: {
      username: { type: 'string', nullable: true },
      rating: { type: 'integer', nullable: true },
    },
  },
  ImportedGameOpening: {
    type: 'object',
    properties: {
      eco: { type: 'string', nullable: true },
      name: { type: 'string', nullable: true },
    },
  },
  ImportedGameAnalysisSummary: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['NOT_ANALYZED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'INTERRUPTED'] },
      runId: { type: 'integer', nullable: true },
      depth: { type: 'integer', nullable: true },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time', nullable: true },
      whiteAccuracy: { type: 'number', nullable: true },
      blackAccuracy: { type: 'number', nullable: true },
      userAccuracy: { type: 'number', nullable: true },
      summary: { type: 'object', nullable: true, additionalProperties: true },
      criticalMoveCount: { type: 'integer', nullable: true },
    },
    required: ['status', 'runId', 'depth', 'completedAt', 'createdAt', 'whiteAccuracy', 'blackAccuracy', 'userAccuracy', 'summary', 'criticalMoveCount'],
  },
  ImportedGameFacetsResponse: {
    type: 'object',
    properties: {
      accounts: { type: 'array', items: { type: 'object', additionalProperties: true } },
      providers: { type: 'array', items: { type: 'object', additionalProperties: true } },
      speeds: { type: 'array', items: { type: 'object', additionalProperties: true } },
      variants: { type: 'array', items: { type: 'object', additionalProperties: true } },
      results: { type: 'array', items: { type: 'object', additionalProperties: true } },
      colors: { type: 'array', items: { type: 'object', additionalProperties: true } },
      openings: { type: 'array', items: { type: 'object', additionalProperties: true } },
      analysisStatuses: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  },
  ImportedGamePlyIndexRequest: {
    type: 'object',
    properties: {
      force: { type: 'boolean', default: false },
    },
  },
  ImportedGamePlyIndexResponse: {
    type: 'object',
    properties: {
      importedGameId: { type: 'integer' },
      status: { type: 'string', enum: ['INDEXED', 'ALREADY_INDEXED', 'FAILED'] },
      pliesIndexed: { type: 'integer', nullable: true },
      plyIndexedAt: { type: 'string', format: 'date-time', nullable: true },
      error: { type: 'string', nullable: true },
    },
    required: ['importedGameId', 'status'],
  },
  OpeningAnalysisWdl: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      wins: { type: 'integer' },
      draws: { type: 'integer' },
      losses: { type: 'integer' },
      scorePct: { type: 'number', nullable: true },
    },
    required: ['total', 'wins', 'draws', 'losses', 'scorePct'],
  },
  OpeningAnalysisNextMove: {
    type: 'object',
    properties: {
      moveUci: { type: 'string' },
      moveSan: { type: 'string', nullable: true },
      fenAfter: { type: 'string' },
      side: { type: 'string', enum: ['WHITE', 'BLACK'] },
      moveNumber: { type: 'integer' },
      occurrences: { type: 'integer' },
      games: { $ref: '#/components/schemas/OpeningAnalysisWdl' },
    },
    required: ['moveUci', 'fenAfter', 'side', 'moveNumber', 'occurrences', 'games'],
  },
  OpeningAnalysisGame: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      provider: { type: 'string' },
      providerGameId: { type: 'string' },
      providerUrl: { type: 'string', nullable: true },
      endedAt: { type: 'string', format: 'date-time', nullable: true },
      speedCategory: { type: 'string', nullable: true },
      timeControl: {
        type: 'object',
        properties: {
          raw: { type: 'string', nullable: true },
          initial: { type: 'integer', nullable: true },
          increment: { type: 'integer', nullable: true },
        },
      },
      white: { $ref: '#/components/schemas/ImportedGamePlayer' },
      black: { $ref: '#/components/schemas/ImportedGamePlayer' },
      userColor: { type: 'string', enum: ['WHITE', 'BLACK'], nullable: true },
      resultForUser: { type: 'string', enum: ['WIN', 'DRAW', 'LOSS'], nullable: true },
      opening: { $ref: '#/components/schemas/ImportedGameOpening' },
      plyNumber: { type: 'integer' },
      moveNumber: { type: 'integer' },
      nextMoveUci: { type: 'string' },
      nextMoveSan: { type: 'string', nullable: true },
    },
    required: ['id', 'provider', 'providerGameId', 'timeControl', 'white', 'black', 'opening', 'plyNumber', 'moveNumber', 'nextMoveUci'],
  },
  OpeningAnalysisResponse: {
    type: 'object',
    properties: {
      fen: { type: 'string' },
      normalizedFen: { type: 'string' },
      sideToMove: { type: 'string', enum: ['WHITE', 'BLACK'] },
      fullMoveNumber: { type: 'integer' },
      ratedOnly: { type: 'boolean' },
      occurrences: { type: 'integer' },
      games: { $ref: '#/components/schemas/OpeningAnalysisWdl' },
      nextMoves: { type: 'array', items: { $ref: '#/components/schemas/OpeningAnalysisNextMove' } },
      topGames: { type: 'array', items: { $ref: '#/components/schemas/OpeningAnalysisGame' } },
      appliedFilters: { type: 'object', additionalProperties: true },
    },
    required: ['fen', 'normalizedFen', 'sideToMove', 'fullMoveNumber', 'ratedOnly', 'occurrences', 'games', 'nextMoves', 'topGames', 'appliedFilters'],
  },
};

const importedGameIdParameter = {
  name: 'gameId',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
};

const searchParameters = [
  { name: 'accountIds', in: 'query', schema: { type: 'string' }, description: 'Comma-separated account ids.' },
  { name: 'providers', in: 'query', schema: { type: 'string' }, description: 'Comma-separated providers, e.g. LICHESS,CHESS_COM.' },
  { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
  { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
  { name: 'resultForUser', in: 'query', schema: { type: 'string' }, description: 'Comma-separated WIN,DRAW,LOSS.' },
  { name: 'userColor', in: 'query', schema: { type: 'string' }, description: 'Comma-separated WHITE,BLACK.' },
  { name: 'rated', in: 'query', schema: { type: 'boolean' } },
  { name: 'speedCategory', in: 'query', schema: { type: 'string' } },
  { name: 'variant', in: 'query', schema: { type: 'string' } },
  { name: 'openingEco', in: 'query', schema: { type: 'string' } },
  { name: 'openingName', in: 'query', schema: { type: 'string' } },
  { name: 'opponent', in: 'query', schema: { type: 'string' } },
  { name: 'timeControl', in: 'query', schema: { type: 'string' } },
  { name: 'minUserRating', in: 'query', schema: { type: 'integer', minimum: 0 } },
  { name: 'maxUserRating', in: 'query', schema: { type: 'integer', minimum: 0 } },
  { name: 'minOpponentRating', in: 'query', schema: { type: 'integer', minimum: 0 } },
  { name: 'maxOpponentRating', in: 'query', schema: { type: 'integer', minimum: 0 } },
  { name: 'minAccuracy', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } },
  { name: 'maxAccuracy', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } },
  { name: 'analysisStatus', in: 'query', schema: { type: 'string' }, description: 'Comma-separated NOT_ANALYZED,QUEUED,RUNNING,COMPLETED,FAILED,INTERRUPTED. Applied to the latest analysis run summary.' },
  { name: 'plyIndexStatus', in: 'query', schema: { type: 'string' }, description: 'Comma-separated NOT_INDEXED,INDEXED,FAILED.' },
  { name: 'classification', in: 'query', schema: { type: 'string' }, description: 'Comma-separated move classifications to require in the latest analysis summary.' },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
  { name: 'cursor', in: 'query', schema: { type: 'string' } },
  { name: 'sort', in: 'query', schema: { type: 'string', enum: ['endedAtDesc', 'endedAtAsc'], default: 'endedAtDesc' } },
];

export const listImportedGamesOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Search imported games for the current user',
  description: 'Returns compact imported-game list rows for the games browser. Heavy PGN/raw JSON and full engine lines are intentionally excluded from this list response.',
  parameters: searchParameters,
  responses: {
    '200': {
      description: 'Imported game search results',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportedGameSearchResponse' } } },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const getOpeningAnalysisOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Get personal opening analysis for one board position',
  description: 'Aggregates indexed ply rows for rated imported games only. Reuses imported-game search filters, then returns WDL from the current user point of view and all next moves played from the requested position.',
  parameters: [
    { name: 'fen', in: 'query', schema: { type: 'string', default: 'startpos' } },
    ...searchParameters,
  ],
  responses: {
    '200': { description: 'Personal opening analysis for the position', content: { 'application/json': { schema: { $ref: '#/components/schemas/OpeningAnalysisResponse' } } } },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const getImportedGameOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Get one imported game',
  parameters: [importedGameIdParameter],
  responses: {
    '200': { description: 'Imported game detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportedGameDetail' } } } },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};

export const getImportedGamePgnOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Get PGN for one imported game',
  parameters: [importedGameIdParameter],
  responses: {
    '200': { description: 'Imported game PGN', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' }, pgn: { type: 'string', nullable: true } } } } } },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};

export const getImportedGameFacetsOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Get imported-game filter facets',
  responses: {
    '200': { description: 'Imported game filter facets', content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportedGameFacetsResponse' } } } },
  },
};

export const indexImportedGamePlyOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Parse one imported game into ply rows',
  description: 'Parses one imported game PGN into lightweight move-by-move rows. This does not run Stockfish and does not build an explorer tree.',
  parameters: [importedGameIdParameter],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ImportedGamePlyIndexRequest' },
        examples: { default: { value: { force: false } } },
      },
    },
  },
  responses: {
    '200': { description: 'Ply indexing result', content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportedGamePlyIndexResponse' } } } },
    '201': { description: 'Ply indexing result', content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportedGamePlyIndexResponse' } } } },
    '400': { $ref: '#/components/responses/BadRequest' },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};
