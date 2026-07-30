import {
  aiBuilderCompletionSummaryContentSchema,
  aiBuilderCompletionSummaryResponseSchema,
  type AiBuilderCompletionSummaryDestination,
  type AiBuilderCompletionSummaryRequest,
  type AiBuilderCompletionSummaryResponse,
} from '@chess-trainer/contracts/ai';
import {
  getChapterWithCourse,
  getLineById,
} from '../../../courses/courses.repository.prisma';
import { loadAiConfig, type AiConfig } from '../../ai.config';
import { AiFeatureError } from '../../ai.errors';
import { OpenAiCompatibleLlmClient } from '../../openai-compatible-llm.client';
import { buildCompletionSummaryContext } from './completion-summary-context';
import { BUILDER_COMPLETION_SUMMARY_SYSTEM_PROMPT } from './completion-summary.prompt';

const SCHEMA_VERSION = 1;
const DISCLAIMER = 'Course changes are authoritative; generated study suggestions are optional.' as const;

interface CompletionSummaryLogger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
}

export interface CompletionSummaryDependencies {
  loadDestination(userId: number, request: AiBuilderCompletionSummaryRequest): Promise<AiBuilderCompletionSummaryDestination>;
  loadConfig(): AiConfig;
  createClient(config: AiConfig, logger?: CompletionSummaryLogger): OpenAiCompatibleLlmClient;
  now(): Date;
}

const defaultDependencies: CompletionSummaryDependencies = {
  loadDestination: loadAuthoritativeDestination,
  loadConfig: loadAiConfig,
  createClient: (config, logger) => new OpenAiCompatibleLlmClient(config, fetch, logger),
  now: () => new Date(),
};

export function createCompletionSummaryService(
  dependencies: Partial<CompletionSummaryDependencies> = {},
) {
  const deps = { ...defaultDependencies, ...dependencies };

  return {
    async generate(
      userId: number,
      request: AiBuilderCompletionSummaryRequest,
      logger?: CompletionSummaryLogger,
    ): Promise<AiBuilderCompletionSummaryResponse> {
      const config = deps.loadConfig();
      ensureFeatureEnabled(config);
      if (!config.configured) {
        throw new AiFeatureError(503, 'AI_PROVIDER_UNAVAILABLE', 'AI provider is not configured.');
      }

      assertCompletionInput(userId, request);
      const destination = await deps.loadDestination(userId, request);
      const context = buildCompletionSummaryContext(request, destination);
      const generated = await deps.createClient(config, logger).generateJson({
        useCase: 'builder-completion-summary',
        systemPrompt: BUILDER_COMPLETION_SUMMARY_SYSTEM_PROMPT,
        input: {
          factualSummary: context.authoritativeResult.factualSummary,
          facts: context.facts,
        },
        outputSchema: aiBuilderCompletionSummaryContentSchema,
        maxOutputTokens: 1000,
      });
      const interpretation = context.reconcile(generated.value);
      const result = request.applyResult;

      return aiBuilderCompletionSummaryResponseSchema.parse({
        kind: 'BUILDER_COMPLETION_SUMMARY',
        schemaVersion: SCHEMA_VERSION,
        generatedAt: deps.now().toISOString(),
        identity: {
          sessionId: request.draft.sessionId,
          sessionRevision: request.draft.sessionRevision,
          targetId: request.draft.targetId,
          courseId: result.courseId,
          chapterId: result.chapterId,
          lineId: result.lineId,
          courseContentRevision: result.courseContentRevision,
        },
        authoritativeResult: context.authoritativeResult,
        interpretation,
        referencedFacts: context.referencedFacts(interpretation),
        disclaimer: DISCLAIMER,
      });
    },
  };
}

function ensureFeatureEnabled(config: AiConfig): void {
  if (!config.enabled || !config.builderCompletionSummaryEnabled) {
    throw new AiFeatureError(404, 'AI_WIDGET_DISABLED', 'Builder completion summary is disabled.');
  }
}

function assertCompletionInput(userId: number, request: AiBuilderCompletionSummaryRequest): void {
  const { draft, destination, selectedTarget, applyResult } = request;
  if (draft.ownerId !== String(userId)) {
    throw new AiFeatureError(403, 'AI_CONTEXT_INVALID', 'Builder draft does not belong to the current user.');
  }
  if (
    destination.courseId !== applyResult.courseId
    || destination.chapterId !== applyResult.chapterId
    || selectedTarget.kind !== applyResult.targetKind
  ) {
    throw staleContext();
  }
  if (selectedTarget.kind === 'EXISTING_LINE' && selectedTarget.lineId !== applyResult.lineId) {
    throw staleContext();
  }
  if (selectedTarget.kind === 'NEW_LINE' && selectedTarget.name.trim() !== applyResult.lineName.trim()) {
    throw staleContext();
  }
  if (
    applyResult.totalDraftMoves !== draft.materializedMoveCount
    || applyResult.skippedBranches !== draft.excludedBranches.length
    || applyResult.createdMoves + applyResult.reusedMoves !== applyResult.totalDraftMoves
    || applyResult.conflictingMoves !== 0
    || applyResult.idempotent !== (applyResult.createdMoves === 0)
  ) {
    throw new AiFeatureError(409, 'AI_CONTEXT_INVALID', 'Builder completion counts do not match the completed draft.');
  }
}

async function loadAuthoritativeDestination(
  userId: number,
  request: AiBuilderCompletionSummaryRequest,
): Promise<AiBuilderCompletionSummaryDestination> {
  const result = request.applyResult;
  const [chapter, line] = await Promise.all([
    getChapterWithCourse(userId, result.chapterId),
    getLineById(userId, result.lineId),
  ]);
  if (!chapter || !line) {
    throw new AiFeatureError(404, 'AI_CONTEXT_NOT_FOUND', 'Applied course destination is no longer available.');
  }
  if (
    chapter.courseId !== result.courseId
    || chapter.courseId !== request.destination.courseId
    || chapter.id !== request.destination.chapterId
    || line.chapterId !== chapter.id
    || line.name !== result.lineName
    || chapter.course.contentRevision !== result.courseContentRevision
  ) {
    throw staleContext();
  }

  return {
    courseId: chapter.course.id,
    courseName: chapter.course.name,
    chapterId: chapter.id,
    chapterName: chapter.name,
  };
}

function staleContext(): AiFeatureError {
  return new AiFeatureError(409, 'AI_CONTEXT_STALE', 'Applied course result changed before the summary was generated.');
}

export const CompletionSummaryService = createCompletionSummaryService();