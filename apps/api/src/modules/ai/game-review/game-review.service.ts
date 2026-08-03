import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  aiGameReviewResponseSchema,
  aiGameReviewStateResponseSchema,
  type AiGameReviewResponse,
  type AiGameReviewStateResponse,
} from '@chess-trainer/contracts/ai';
import { ImportedGamesService } from '../../imported-games/imported-games.service';
import { GameAnalysisService } from '../../analysis/game-analysis.service';
import { loadAiConfig, type AiConfig } from '../ai.config';
import { AiFeatureError } from '../ai.errors';
import { OpenAiCompatibleLlmClient } from '../openai-compatible-llm.client';
import {
  buildGameReviewContext,
  type AuthoritativeReviewMove,
  type GameReviewAnalysisRun,
  type GameReviewContextResult,
} from './game-review-context';
import { GAME_REVIEW_SYSTEM_PROMPT } from './game-review.prompt';
import {
  findStoredGameReview,
  upsertStoredGameReview,
} from './game-review.repository.prisma';

const GAME_REVIEW_SCHEMA_VERSION = 1;
const GAME_REVIEW_PROMPT_VERSION = 2;
const GAME_REVIEW_GROUNDING_VERSION = 2;
const MAX_OPENING_ASSESSMENT_LENGTH = 800;
const MISSED_OPPORTUNITY_CLASSIFICATIONS = new Set([
  'INACCURACY',
  'MISTAKE',
  'BLUNDER',
  'MISS',
]);

const modelOpeningPlanReferenceSchema = z.object({
  planId: z.string().trim().min(1).max(160),
  plyNumber: z.number().int().positive(),
  claim: z.enum(['ALIGNED', 'MISSED_OPPORTUNITY']),
});

const modelGameReviewSchema = z.object({
  headline: z.string().min(1).max(160),
  overview: z.string().min(1).max(1500),
  openingAssessment: z.string().min(1).max(800),
  openingPlanReferences: z.array(modelOpeningPlanReferenceSchema).max(3),
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
type OpeningKnowledgeStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
type OpeningPlanClaim = z.infer<typeof modelOpeningPlanReferenceSchema>;

interface StoredGameReview {
  analysisRunId: number | null;
  inputHash: string;
  schemaVersion: number;
  promptVersion: number;
  model: string;
  content: unknown;
}

interface OpeningKnowledgePlanContext {
  id: string;
  title: string;
  summary: string;
}

interface OpeningKnowledgeContext {
  status: OpeningKnowledgeStatus;
  opening: { name: string } | null;
  side: 'WHITE' | 'BLACK' | null;
  shortDescription: { text: string } | null;
  strategicSummary: { text: string } | null;
  plans: OpeningKnowledgePlanContext[];
}

interface ValidatedOpeningPlanReference {
  reference: OpeningPlanClaim;
  plan: OpeningKnowledgePlanContext;
  move: AuthoritativeReviewMove;
}

interface ReviewLogger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
}

export interface GameReviewDependencies {
  getGame(userId: number, gameId: number): Promise<GameDetail | null>;
  getAnalysis(userId: number, gameId: number): Promise<{ run: GameReviewAnalysisRun }>;
  getStoredReview(userId: number, gameId: number): Promise<StoredGameReview | null>;
  saveStoredReview(input: {
    userId: number;
    importedGameId: number;
    analysisRunId: number;
    inputHash: string;
    schemaVersion: number;
    promptVersion: number;
    provider: string;
    model: string;
    content: AiGameReviewResponse;
    generatedAt: Date;
  }): Promise<unknown>;
  loadConfig(): AiConfig;
  createClient(config: AiConfig, logger?: ReviewLogger): OpenAiCompatibleLlmClient;
  now(): Date;
}

const defaultDependencies: GameReviewDependencies = {
  getGame: (userId, gameId) => ImportedGamesService.get(userId, gameId),
  getAnalysis: (userId, gameId) => GameAnalysisService.getImportedGameAnalysis(userId, gameId),
  getStoredReview: findStoredGameReview,
  saveStoredReview: upsertStoredGameReview,
  loadConfig: loadAiConfig,
  createClient: (config, logger) => new OpenAiCompatibleLlmClient(config, fetch, logger),
  now: () => new Date(),
};

export function createGameReviewService(
  dependencies: Partial<GameReviewDependencies> = {},
) {
  const deps = { ...defaultDependencies, ...dependencies };

  return {
    getStored: async (userId: number, gameId: number): Promise<AiGameReviewStateResponse> => {
      const config = deps.loadConfig();
      ensureFeatureEnabled(config);

      const game = await deps.getGame(userId, gameId);
      if (!game) {
        throw new AiFeatureError(404, 'IMPORTED_GAME_NOT_FOUND', 'Imported game not found.');
      }

      let stored: StoredGameReview | null;
      try {
        stored = await deps.getStoredReview(userId, gameId);
      } catch {
        throw new AiFeatureError(500, 'AI_REVIEW_STORAGE_ERROR', 'Could not load the saved AI game review.');
      }
      if (!stored) return emptyStoredReview();
      if (
        stored.schemaVersion !== GAME_REVIEW_SCHEMA_VERSION
        || stored.promptVersion !== GAME_REVIEW_PROMPT_VERSION
        || stored.model !== config.model
        || !game.pgn
      ) {
        return emptyStoredReview();
      }

      let analysis: { run: GameReviewAnalysisRun };
      let built: GameReviewContextResult;
      try {
        analysis = await deps.getAnalysis(userId, gameId);
        if (analysis.run.status !== 'COMPLETED') return emptyStoredReview();
        built = buildGameReviewContext(game, analysis.run);
      } catch {
        return emptyStoredReview();
      }

      const currentInputHash = reviewInputHash({
        gameUpdatedAt: game.updatedAt,
        analysisRunId: analysis.run.id,
        analysisCompletedAt: analysis.run.completedAt,
        provider: config.provider,
        model: config.model,
        context: built.context,
      });
      if (stored.analysisRunId !== analysis.run.id || stored.inputHash !== currentInputHash) {
        return emptyStoredReview();
      }

      const parsed = aiGameReviewResponseSchema.safeParse(stored.content);
      if (!parsed.success) {
        throw new AiFeatureError(500, 'AI_STORED_RESPONSE_INVALID', 'The saved AI game review is invalid.');
      }
      return aiGameReviewStateResponseSchema.parse({ review: parsed.data });
    },

    generate: async (
      userId: number,
      gameId: number,
      logger?: ReviewLogger,
    ): Promise<AiGameReviewResponse> => {
      const config = deps.loadConfig();
      ensureFeatureEnabled(config);
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

      let built: GameReviewContextResult;
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
      const openingPlanReferences = validateOpeningPlanReferences(
        generated.value.openingPlanReferences,
        built,
      );

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

      const generatedAt = deps.now();
      const response = aiGameReviewResponseSchema.parse({
        kind: 'GAME_REVIEW',
        schemaVersion: GAME_REVIEW_SCHEMA_VERSION,
        generatedAt: generatedAt.toISOString(),
        review: {
          headline: generated.value.headline,
          overview: generated.value.overview,
          openingAssessment: buildOpeningAssessment(built, openingPlanReferences),
          turningPoints,
          strengths: generated.value.strengths,
          improvements: generated.value.improvements,
          practicePriorities: generated.value.practicePriorities,
          themes: generated.value.themes,
        },
        warnings: built.warnings,
      });

      try {
        await deps.saveStoredReview({
          userId,
          importedGameId: gameId,
          analysisRunId: analysis.run.id,
          inputHash: reviewInputHash({
            gameUpdatedAt: game.updatedAt,
            analysisRunId: analysis.run.id,
            analysisCompletedAt: analysis.run.completedAt,
            provider: config.provider,
            model: config.model,
            context: built.context,
          }),
          schemaVersion: GAME_REVIEW_SCHEMA_VERSION,
          promptVersion: GAME_REVIEW_PROMPT_VERSION,
          provider: config.provider,
          model: config.model,
          content: response,
          generatedAt,
        });
      } catch {
        throw new AiFeatureError(500, 'AI_REVIEW_STORAGE_ERROR', 'The AI review was generated but could not be saved.');
      }

      return response;
    },
  };
}

function validateOpeningPlanReferences(
  references: readonly OpeningPlanClaim[],
  built: GameReviewContextResult,
): ValidatedOpeningPlanReference[] {
  const knowledge = openingKnowledgeContext(built);
  const plansById = new Map(knowledge?.plans.map((plan) => [plan.id, plan]) ?? []);
  const validated: ValidatedOpeningPlanReference[] = [];

  for (const reference of references) {
    const plan = plansById.get(reference.planId);
    if (!plan || !built.openingKnowledgePlanIds.has(reference.planId)) {
      throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI review referenced an unsupported opening plan.');
    }
    const move = built.authoritativeMoves.get(reference.plyNumber);
    if (!move) {
      throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI review referenced an unknown game move.');
    }
    if (!knowledge?.side || move.side !== knowledge.side) {
      throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI review attached a user-side opening plan to an opponent move.');
    }
    if (reference.claim === 'MISSED_OPPORTUNITY' && !supportsMissedOpportunity(move)) {
      throw new AiFeatureError(
        502,
        'AI_INVALID_RESPONSE',
        'AI review claimed a missed opening-plan opportunity without supporting move analysis.',
      );
    }
    validated.push({ reference, plan, move });
  }

  return validated;
}

function buildOpeningAssessment(
  built: GameReviewContextResult,
  references: readonly ValidatedOpeningPlanReference[],
): string {
  const knowledge = openingKnowledgeContext(built);
  if (!knowledge || knowledge.status === 'UNAVAILABLE') {
    return knowledge?.opening?.name
      ? `No reviewed strategic opening guidance was available for ${knowledge.opening.name}.`
      : 'No reviewed strategic opening guidance was available for this game.';
  }

  const sentences: string[] = [];
  const strategicText = knowledge.strategicSummary?.text ?? knowledge.shortDescription?.text;
  if (strategicText) sentences.push(asSentence(strategicText));

  for (const { reference, plan, move } of references) {
    const moveLabel = formatMoveLabel(move);
    sentences.push(reference.claim === 'MISSED_OPPORTUNITY'
      ? `At ${moveLabel}, the move analysis supports a possible missed opportunity related to the reviewed plan “${plan.title}”: ${asSentence(plan.summary)}`
      : `At ${moveLabel}, the generated review associated your play with the reviewed plan “${plan.title}”: ${asSentence(plan.summary)}`);
  }

  if (sentences.length === 0) {
    return knowledge.opening?.name
      ? `Reviewed opening knowledge was available for ${knowledge.opening.name}, but no concrete plan claim was identified in this game.`
      : 'Reviewed opening knowledge was available, but no concrete plan claim was identified in this game.';
  }
  return joinBoundedSentences(sentences, MAX_OPENING_ASSESSMENT_LENGTH);
}

function openingKnowledgeContext(built: GameReviewContextResult): OpeningKnowledgeContext | null {
  const value = built.context['openingKnowledge'];
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<OpeningKnowledgeContext>;
  if (!isOpeningKnowledgeStatus(candidate.status)) return null;
  const side = candidate.side === 'WHITE' || candidate.side === 'BLACK' ? candidate.side : null;
  const plans = Array.isArray(candidate.plans)
    ? candidate.plans.filter(isOpeningKnowledgePlan)
    : [];
  return {
    status: candidate.status,
    opening: candidate.opening && typeof candidate.opening.name === 'string'
      ? { name: candidate.opening.name }
      : null,
    side,
    shortDescription: statement(candidate.shortDescription),
    strategicSummary: statement(candidate.strategicSummary),
    plans,
  };
}

function isOpeningKnowledgeStatus(value: unknown): value is OpeningKnowledgeStatus {
  return value === 'AVAILABLE' || value === 'PARTIAL' || value === 'UNAVAILABLE';
}

function isOpeningKnowledgePlan(value: unknown): value is OpeningKnowledgePlanContext {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<OpeningKnowledgePlanContext>;
  return typeof plan.id === 'string'
    && typeof plan.title === 'string'
    && typeof plan.summary === 'string';
}

function statement(value: unknown): { text: string } | null {
  if (!value || typeof value !== 'object') return null;
  const text = (value as { text?: unknown }).text;
  return typeof text === 'string' && text.trim() ? { text: text.trim() } : null;
}

function supportsMissedOpportunity(move: AuthoritativeReviewMove): boolean {
  if ((move.scoreLossCp ?? 0) >= 30) return true;
  return MISSED_OPPORTUNITY_CLASSIFICATIONS.has((move.classification ?? '').toUpperCase());
}

function formatMoveLabel(move: AuthoritativeReviewMove): string {
  const prefix = `${move.moveNumber}${move.side === 'BLACK' ? '...' : '.'}`;
  return move.playedMoveSan ? `${prefix} ${move.playedMoveSan}` : `${prefix} the played move`;
}

function asSentence(value: string): string {
  const text = value.trim();
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function joinBoundedSentences(sentences: readonly string[], maxLength: number): string {
  let result = '';
  for (const sentence of sentences.map((value) => value.trim()).filter(Boolean)) {
    const candidate = result ? `${result} ${sentence}` : sentence;
    if (candidate.length <= maxLength) {
      result = candidate;
      continue;
    }
    if (!result) return `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
    break;
  }
  return result;
}

function emptyStoredReview(): AiGameReviewStateResponse {
  return aiGameReviewStateResponseSchema.parse({ review: null });
}

function ensureFeatureEnabled(config: AiConfig): void {
  if (!config.enabled || !config.gameReviewEnabled) {
    throw new AiFeatureError(404, 'AI_WIDGET_DISABLED', 'AI game review is disabled.');
  }
}

function reviewInputHash(input: {
  gameUpdatedAt: string;
  analysisRunId: number;
  analysisCompletedAt: string | null;
  provider: string;
  model: string;
  context: Record<string, unknown>;
}): string {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: GAME_REVIEW_SCHEMA_VERSION,
    promptVersion: GAME_REVIEW_PROMPT_VERSION,
    groundingVersion: GAME_REVIEW_GROUNDING_VERSION,
    ...input,
  })).digest('hex');
}

export const GameReviewService = createGameReviewService();
