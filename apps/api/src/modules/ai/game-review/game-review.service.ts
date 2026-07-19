import { z } from 'zod';
import {
  aiGameReviewResponseSchema,
  type AiGameReviewResponse,
} from '@chess-trainer/contracts/ai';
import { ImportedGamesService } from '../../imported-games/imported-games.service';
import { GameAnalysisService } from '../../analysis/game-analysis.service';
import { loadAiConfig, type AiConfig } from '../ai.config';
import { AiFeatureError } from '../ai.errors';
import { OpenAiCompatibleLlmClient } from '../openai-compatible-llm.client';
import {
  buildGameReviewContext,
  type GameReviewAnalysisRun,
} from './game-review-context';
import { GAME_REVIEW_SYSTEM_PROMPT } from './game-review.prompt';

const modelGameReviewSchema = z.object({
  headline: z.string().min(1).max(160),
  overview: z.string().min(1).max(1500),
  openingAssessment: z.string().min(1).max(800),
  turningPoints: z.array(z.object({
    plyNumber: z.number().int().positive(),
    explanation: z.string().min(1).max(700),
  })).max(6),
  strengths: z.array(z.string().min(1).max(300)).max(4),
  improvements: z.array(z.string().min(1).max(300)).max(4),
  practicePriorities: z.array(z.string().min(1).max(300)).max(3),
  themes: z.array(z.string().min(1).max(80)).max(6),
});

type GameDetail = NonNullable<Awaited<ReturnType<typeof ImportedGamesService.get>>>;

interface ReviewLogger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
}

export interface GameReviewDependencies {
  getGame(userId: number, gameId: number): Promise<GameDetail | null>;
  getAnalysis(userId: number, gameId: number): Promise<{ run: GameReviewAnalysisRun }>;
  loadConfig(): AiConfig;
  createClient(config: AiConfig, logger?: ReviewLogger): OpenAiCompatibleLlmClient;
  now(): Date;
}

const defaultDependencies: GameReviewDependencies = {
  getGame: (userId, gameId) => ImportedGamesService.get(userId, gameId),
  getAnalysis: (userId, gameId) => GameAnalysisService.getImportedGameAnalysis(userId, gameId),
  loadConfig: loadAiConfig,
  createClient: (config, logger) => new OpenAiCompatibleLlmClient(config, fetch, logger),
  now: () => new Date(),
};

export function createGameReviewService(
  dependencies: Partial<GameReviewDependencies> = {},
) {
  const deps = { ...defaultDependencies, ...dependencies };

  return {
    generate: async (
      userId: number,
      gameId: number,
      logger?: ReviewLogger,
    ): Promise<AiGameReviewResponse> => {
      const config = deps.loadConfig();
      if (!config.enabled || !config.gameReviewEnabled) {
        throw new AiFeatureError(404, 'AI_WIDGET_DISABLED', 'AI game review is disabled.');
      }
      if (!config.configured) {
        throw new AiFeatureError(503, 'AI_PROVIDER_UNAVAILABLE', 'AI provider is not configured.');
      }

      const game = await deps.getGame(userId, gameId);
      if (!game) {
        throw new AiFeatureError(404, 'IMPORTED_GAME_NOT_FOUND', 'Imported game not found.');
      }
      if (!game.pgn) {
        throw new AiFeatureError(409, 'GAME_PGN_REQUIRED', 'Game PGN is required for AI review.');
      }

      let analysis: { run: GameReviewAnalysisRun };
      try {
        analysis = await deps.getAnalysis(userId, gameId);
      } catch (error: any) {
        if (error?.message === 'Imported game not found') {
          throw new AiFeatureError(404, 'IMPORTED_GAME_NOT_FOUND', 'Imported game not found.');
        }
        throw new AiFeatureError(409, 'GAME_ANALYSIS_REQUIRED', 'Completed game analysis is required for AI review.');
      }
      if (analysis.run.status !== 'COMPLETED') {
        throw new AiFeatureError(409, 'GAME_ANALYSIS_REQUIRED', 'Completed game analysis is required for AI review.');
      }

      let built;
      try {
        built = buildGameReviewContext(game, analysis.run);
      } catch {
        throw new AiFeatureError(409, 'GAME_PGN_REQUIRED', 'Game PGN could not be parsed for AI review.');
      }

      const generated = await deps.createClient(config, logger).generateJson({
        useCase: 'game-review',
        systemPrompt: GAME_REVIEW_SYSTEM_PROMPT,
        input: built.context,
        outputSchema: modelGameReviewSchema,
        maxOutputTokens: 1800,
      });

      const turningPoints = generated.value.turningPoints.map((turningPoint) => {
        const move = built.authoritativeMoves.get(turningPoint.plyNumber);
        if (!move) {
          throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI review referenced an unknown game move.');
        }
        return {
          ...move,
          explanation: turningPoint.explanation,
        };
      });

      return aiGameReviewResponseSchema.parse({
        kind: 'GAME_REVIEW',
        schemaVersion: 1,
        generatedAt: deps.now().toISOString(),
        review: {
          headline: generated.value.headline,
          overview: generated.value.overview,
          openingAssessment: generated.value.openingAssessment,
          turningPoints,
          strengths: generated.value.strengths,
          improvements: generated.value.improvements,
          practicePriorities: generated.value.practicePriorities,
          themes: generated.value.themes,
        },
        warnings: built.warnings,
      });
    },
  };
}

export const GameReviewService = createGameReviewService();
