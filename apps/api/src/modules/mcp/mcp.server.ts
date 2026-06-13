import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GameAnalysisService } from '../analysis/game-analysis.service';
import { ImportedGameQueryService } from '../imported-games/imported-game-query.service';
import { OpeningAnalysisService } from '../imported-games/opening-analysis.service';
import { BoardImagesService, BoardImageValidationError } from '../board-images/board-images.service';
import {
  toJsonValue,
  toMcpError,
  toMcpFacets,
  toMcpGameDetail,
  toMcpGameSummary,
} from './mcp.mappers';
import {
  getImportedGameAnalysisInputSchema,
  getImportedGameFacetsInputSchema,
  getImportedGameInputSchema,
  getImportedGamePgnInputSchema,
  getOpeningAnalysisInputSchema,
  getBoardImageUrlInputSchema,
  searchImportedGamesInputSchema,
  summarizeImportedGamesInputSchema,
  toImportedGameSearchQuery,
  toImportedGameSummaryQuery,
  toOpeningAnalysisQuery,
} from './mcp.schemas';

interface McpLogger {
  error(data: unknown, message?: string): void;
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function structuredResult(text: string, value: unknown) {
  const structuredContent = toJsonValue(value);
  if (!structuredContent || Array.isArray(structuredContent) || typeof structuredContent !== 'object') {
    throw new Error('MCP structured result must be an object');
  }
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent,
  };
}

function structuredContentOnly(value: unknown) {
  const structuredContent = toJsonValue(value);
  if (!structuredContent || Array.isArray(structuredContent) || typeof structuredContent !== 'object') {
    throw new Error('MCP structured result must be an object');
  }
  return {
    content: [],
    structuredContent,
  };
}

function unexpectedToolError(logger: McpLogger, toolName: string, error: unknown) {
  logger.error({ err: error, toolName }, 'Unexpected MCP tool failure');
  return toMcpError('The MCP tool could not complete the request.', 'INTERNAL_ERROR');
}

export function createChessMcpServer(logger: McpLogger, userId?: number) {
  const server = new McpServer({
    name: 'chess-repertoire-trainer',
    version: '0.1.0',
  });

  server.registerTool('get_board_image_url', {
    description: 'Validate a chess FEN and build a Chessvision board image URL without fetching the image.',
    inputSchema: getBoardImageUrlInputSchema,
    annotations: readOnlyAnnotations,
  }, async (input) => {
    try {
      const result = BoardImagesService.buildBoardImageUrl(input);
      return structuredResult(`Built board image URL for ${result.normalizedFen}.`, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof BoardImageValidationError) return toMcpError(message, 'BAD_REQUEST');
      return unexpectedToolError(logger, 'get_board_image_url', error);
    }
  });

  server.registerTool('search_imported_games', {
    description: 'Search already-imported chess games using account, date, result, opening, rating, and analysis filters.',
    inputSchema: searchImportedGamesInputSchema,
    annotations: readOnlyAnnotations,
  }, async (input) => {
    if (!userId) return toMcpError('Application user authentication is required for imported-game tools.', 'UNAUTHORIZED');
    try {
      const page = await ImportedGameQueryService.searchPage(userId, toImportedGameSearchQuery(input));
      const result = {
        items: page.rows.map(toMcpGameSummary),
        pageInfo: page.pageInfo,
        appliedFilters: toJsonValue(page.appliedCriteria),
      };
      const suffix = page.pageInfo.hasMore ? ' More results are available with nextCursor.' : '';
      return structuredResult(`Found ${result.items.length} imported games.${suffix}`, result);
    } catch (error) {
      return unexpectedToolError(logger, 'search_imported_games', error);
    }
  });

  server.registerTool('summarize_imported_games', {
    description: 'Summarize already-imported chess games using the same filters as imported-game search, without pagination.',
    inputSchema: summarizeImportedGamesInputSchema,
    annotations: readOnlyAnnotations,
  }, async (input) => {
    if (!userId) return toMcpError('Application user authentication is required for imported-game tools.', 'UNAUTHORIZED');
    try {
      const result = await ImportedGameQueryService.summarize(userId, toImportedGameSummaryQuery(input));
      return structuredContentOnly(result);
    } catch (error) {
      return unexpectedToolError(logger, 'summarize_imported_games', error);
    }
  });

  server.registerTool('get_imported_game', {
    description: 'Load one imported game and optionally include its indexed plies. Raw PGN is available through get_imported_game_pgn.',
    inputSchema: getImportedGameInputSchema,
    annotations: readOnlyAnnotations,
  }, async ({ gameId, includePlies }) => {
    if (!userId) return toMcpError('Application user authentication is required for imported-game tools.', 'UNAUTHORIZED');
    try {
      const row = await ImportedGameQueryService.getDetail(userId, gameId);
      if (!row) return toMcpError(`Imported game ${gameId} was not found.`, 'NOT_FOUND');
      return structuredResult(
        `Loaded imported game ${gameId}. Use get_imported_game_pgn for raw PGN.`,
        { game: toMcpGameDetail(row, { includePlies }) },
      );
    } catch (error) {
      return unexpectedToolError(logger, 'get_imported_game', error);
    }
  });

  server.registerTool('get_imported_game_pgn', {
    description: 'Get the raw stored PGN for one imported game.',
    inputSchema: getImportedGamePgnInputSchema,
    annotations: readOnlyAnnotations,
  }, async ({ gameId }) => {
    if (!userId) return toMcpError('Application user authentication is required for imported-game tools.', 'UNAUTHORIZED');
    try {
      const game = await ImportedGameQueryService.getPgn(userId, gameId);
      if (!game) return toMcpError(`Imported game ${gameId} was not found.`, 'NOT_FOUND');
      const text = game.pgn
        ? `PGN for imported game ${gameId}:\n\n${game.pgn}`
        : `Imported game ${gameId} exists but has no stored PGN.`;
      return structuredResult(text, game);
    } catch (error) {
      return unexpectedToolError(logger, 'get_imported_game_pgn', error);
    }
  });

  server.registerTool('get_imported_game_facets', {
    description: 'List available imported-game accounts and filter facet counts.',
    inputSchema: getImportedGameFacetsInputSchema,
    annotations: readOnlyAnnotations,
  }, async () => {
    if (!userId) return toMcpError('Application user authentication is required for imported-game tools.', 'UNAUTHORIZED');
    try {
      const facets = toMcpFacets(await ImportedGameQueryService.getFacets(userId));
      return structuredResult('Loaded imported-game filter facets.', facets);
    } catch (error) {
      return unexpectedToolError(logger, 'get_imported_game_facets', error);
    }
  });

  server.registerTool('get_imported_game_analysis', {
    description: 'Get the latest stored analysis run for one imported game without starting new analysis.',
    inputSchema: getImportedGameAnalysisInputSchema,
    annotations: readOnlyAnnotations,
  }, async ({ gameId }) => {
    if (!userId) return toMcpError('Application user authentication is required for imported-game tools.', 'UNAUTHORIZED');
    try {
      const analysis = await GameAnalysisService.getImportedGameAnalysis(userId, gameId);
      return structuredResult(`Loaded stored analysis for imported game ${gameId}.`, analysis);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'Imported game not found' || message === 'Imported game analysis not found') {
        return toMcpError(message, 'NOT_FOUND');
      }
      return unexpectedToolError(logger, 'get_imported_game_analysis', error);
    }
  });

  server.registerTool('get_opening_analysis', {
    description: 'Analyze an opening position across already-imported games using the same game filters as imported-game search.',
    inputSchema: getOpeningAnalysisInputSchema,
    annotations: readOnlyAnnotations,
  }, async (input) => {
    if (!userId) return toMcpError('Application user authentication is required for imported-game tools.', 'UNAUTHORIZED');
    try {
      const analysis = await OpeningAnalysisService.getPosition(userId, toOpeningAnalysisQuery(input));
      return structuredResult(
        `Loaded opening analysis for ${analysis.normalizedFen} from ${analysis.games.total} games.`,
        analysis,
      );
    } catch (error) {
      return unexpectedToolError(logger, 'get_opening_analysis', error);
    }
  });

  return server;
}
