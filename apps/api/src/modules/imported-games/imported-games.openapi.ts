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
      tagCodes: { type: 'array', items: { type: 'integer' } },
      tags: { type: 'array', items: { $ref: '#/components/schemas/GameTagDefinition' } },
      plyIndex: { $ref: '#/components/schemas/ImportedGamePlyIndexSummary' },
      analysis: { $ref: '#/components/schemas/ImportedGameAnalysisSummary' },
    },
    required: ['id', 'accountId', 'provider', 'providerGameId', 'timeControl', 'white', 'black', 'opening', 'tagCodes', 'tags', 'plyIndex', 'analysis'],
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
      status: { type: 'string', enum: ['NOT_ANALYZED', 'RUNNING', 'COMPLETED', 'FAILED'] },
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
  ImportedGamePlyIndexSummary: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['NOT_INDEXED', 'INDEXED', 'FAILED'] },
      indexedAt: { type: 'string', format: 'date-time', nullable: true },
      error: { type: 'string', nullable: true },
    },
    required: ['status', 'indexedAt', 'error'],
  },
  GameTagDefinition: {
    type: 'object',
    properties: {
      code: { type: 'integer' },
      name: { type: 'string' },
    },
    required: ['code', 'name'],
  },
  GameTagDefinitionsResponse: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/GameTagDefinition' } },
    },
    required: ['items'],
  },
  ImportedGameTagsRefreshResponse: {
    type: 'object',
    properties: {
      importedGameId: { type: 'integer' },
      tagCodes: { type: 'array', items: { type: 'integer' } },
      tags: { type: 'array', items: { $ref: '#/components/schemas/GameTagDefinition' } },
    },
    required: ['importedGameId', 'tagCodes', 'tags'],
  },
  ImportedGameFullRefreshAcceptedResponse: {
    type: 'object',
    properties: {
      accepted: { type: 'boolean' },
      importedGameId: { type: 'integer' },
      steps: {
        type: 'array',
        items: { type: 'string', enum: ['PLY_INDEX', 'ANALYSIS', 'TAGS'] },
      },
    },
    required: ['accepted', 'importedGameId', 'steps'],
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
      tags: { type: 'array', items: { type: 'object', additionalProperties: true } },
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
  GamePerformanceWdl: {
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
  GamePerformanceTagStat: {
    type: 'object',
    properties: {
      code: { type: 'integer' },
      name: { type: 'string' },
      games: { type: 'integer' },
      ratePct: { type: 'number' },
      wdl: { $ref: '#/components/schemas/GamePerformanceWdl' },
    },
    required: ['code', 'name', 'games', 'ratePct', 'wdl'],
  },
  GamePerformanceBucket: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      label: { type: 'string' },
      games: { type: 'integer' },
      ratePct: { type: 'number' },
      tags: { type: 'array', items: { $ref: '#/components/schemas/GamePerformanceTagStat' } },
    },
    required: ['key', 'label', 'games', 'ratePct', 'tags'],
  },
  GamePerformanceSummary: {
    type: 'object',
    properties: {
      sample: {
        type: 'object',
        properties: {
          games: { type: 'integer' },
          taggedGames: { type: 'integer' },
        },
        required: ['games', 'taggedGames'],
      },
      wdl: { $ref: '#/components/schemas/GamePerformanceWdl' },
      tags: { type: 'array', items: { $ref: '#/components/schemas/GamePerformanceTagStat' } },
      buckets: { type: 'array', items: { $ref: '#/components/schemas/GamePerformanceBucket' } },
    },
    required: ['sample', 'wdl', 'tags', 'buckets'],
  },
  OpeningBookMatch: {
    type: 'object',
    properties: {
      eco: { type: 'string' },
      name: { type: 'string' },
      pgn: { type: 'string' },
      uci: { type: 'string' },
      epd: { type: 'string' },
      ply: { type: 'integer' },
      source: { type: 'string', enum: ['ECO', 'FEN', 'MOVES'] },
    },
    required: ['eco', 'name', 'pgn', 'uci', 'epd', 'ply', 'source'],
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
      bookOpening: { anyOf: [{ $ref: '#/components/schemas/OpeningBookMatch' }, { type: 'null' }] },
      sideToMove: { type: 'string', enum: ['WHITE', 'BLACK'] },
      fullMoveNumber: { type: 'integer' },
      ratedOnly: { type: 'boolean' },
      occurrences: { type: 'integer' },
      games: { $ref: '#/components/schemas/OpeningAnalysisWdl' },
      nextMoves: { type: 'array', items: { $ref: '#/components/schemas/OpeningAnalysisNextMove' } },
      appliedFilters: { type: 'object', additionalProperties: true },
    },
    required: ['fen', 'normalizedFen', 'bookOpening', 'sideToMove', 'fullMoveNumber', 'ratedOnly', 'occurrences', 'games', 'nextMoves', 'appliedFilters'],
  },
  OpeningAnalysisPerformanceResponse: {
    type: 'object',
    properties: {
      fen: { type: 'string' },
      normalizedFen: { type: 'string' },
      performance: { $ref: '#/components/schemas/GamePerformanceSummary' },
      appliedFilters: { type: 'object', additionalProperties: true },
    },
    required: ['fen', 'normalizedFen', 'performance', 'appliedFilters'],
  },
  OpeningAnalysisTopGamesResponse: {
    type: 'object',
    properties: {
      fen: { type: 'string' },
      normalizedFen: { type: 'string' },
      topGames: { type: 'array', items: { $ref: '#/components/schemas/OpeningAnalysisGame' } },
      appliedFilters: { type: 'object', additionalProperties: true },
    },
    required: ['fen', 'normalizedFen', 'topGames', 'appliedFilters'],
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
  { name: 'analysisStatus', in: 'query', schema: { type: 'string' }, description: 'Comma-separated NOT_ANALYZED,RUNNING,COMPLETED,FAILED. Applied to the latest analysis run summary.' },
  { name: 'plyIndexStatus', in: 'query', schema: { type: 'string' }, description: 'Comma-separated NOT_INDEXED,INDEXED,FAILED.' },
  { name: 'tagFilter', in: 'query', schema: { type: 'string', enum: ['NO_TAGS'] }, description: 'Set to NO_TAGS to match games with no imported-game tags.' },
  { name: 'tagCodes', in: 'query', schema: { type: 'string' }, description: 'Comma-separated imported-game tag codes. Matches games with any selected tag.' },
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
  summary: 'Get core opening analysis for one board position',
  description: 'Fast first-render endpoint. Reuses imported-game search filters, then returns position WDL, next moves, and opening-book lookup. Performance, top games, and stored engine analysis are intentionally separate panel requests.',
  parameters: [
    { name: 'fen', in: 'query', schema: { type: 'string', default: 'startpos' } },
    ...searchParameters,
  ],
  responses: {
    '200': { description: 'Personal opening analysis for the position', content: { 'application/json': { schema: { $ref: '#/components/schemas/OpeningAnalysisResponse' } } } },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const getOpeningAnalysisPerformanceOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Get opening position performance summary',
  description: 'Returns the server-owned performance tag and bucket summary for distinct imported games that reached the requested normalized position. Uses the same imported-game filters as the core opening-analysis endpoint.',
  parameters: [
    { name: 'fen', in: 'query', schema: { type: 'string', default: 'startpos' } },
    ...searchParameters,
  ],
  responses: {
    '200': { description: 'Performance summary for the position', content: { 'application/json': { schema: { $ref: '#/components/schemas/OpeningAnalysisPerformanceResponse' } } } },
    '400': { $ref: '#/components/responses/BadRequest' },
  },
};

export const getOpeningAnalysisTopGamesOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Get recent top games for one opening position',
  description: 'Returns the most recent distinct games that reached the requested normalized position. Uses the same imported-game filters as the core opening-analysis endpoint and orders by endedAt DESC, id DESC.',
  parameters: [
    { name: 'fen', in: 'query', schema: { type: 'string', default: 'startpos' } },
    ...searchParameters,
    { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
  ],
  responses: {
    '200': { description: 'Recent games for the position', content: { 'application/json': { schema: { $ref: '#/components/schemas/OpeningAnalysisTopGamesResponse' } } } },
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

export const getImportedGameTagDefinitionsOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Get imported-game tag definitions',
  responses: {
    '200': {
      description: 'Imported-game tag definitions',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/GameTagDefinitionsResponse' } } },
    },
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

export const refreshImportedGameTagsOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Refresh imported-game tags for one game',
  parameters: [importedGameIdParameter],
  responses: {
    '200': {
      description: 'Imported-game tags refreshed',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ImportedGameTagsRefreshResponse' } } },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
    '404': { $ref: '#/components/responses/NotFound' },
  },
};

export const createImportedGameFullRefreshRunOpenApiOperation = {
  tags: ['Imported games'],
  summary: 'Queue a full refresh for one imported game',
  description: 'Force re-indexes plies, recalculates Stockfish analysis, and refreshes tags after analysis succeeds.',
  parameters: [importedGameIdParameter],
  responses: {
    '200': {
      description: 'Full refresh accepted',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ImportedGameFullRefreshAcceptedResponse' },
        },
      },
    },
    '400': { $ref: '#/components/responses/BadRequest' },
    '403': {
      description: 'Local batch Stockfish analysis is disabled',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
};
