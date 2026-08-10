import {
  aiBuilderCandidateExplanationContentSchema,
  aiBuilderCandidateExplanationResponseSchema,
  type AiBuilderCandidateExplanationRequest,
  type AiBuilderCandidateExplanationResponse,
} from '@chess-trainer/contracts/ai';
import type {
  CandidateDecisionCandidate,
  CandidateDecisionRequest,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import { CandidateDecisionOpponentPreparationService } from '../../../candidate-decision/candidate-decision-opponent-preparation.service';
import { loadAiConfig, type AiConfig } from '../../ai.config';
import { AiFeatureError } from '../../ai.errors';
import { OpenAiCompatibleLlmClient } from '../../openai-compatible-llm.client';
import { buildCandidateExplanationContext } from './candidate-explanation-context';
import { BUILDER_CANDIDATE_EXPLANATION_SYSTEM_PROMPT } from './candidate-explanation.prompt';

const SCHEMA_VERSION = 1;
const DISCLAIMER = 'Candidate ranking remains deterministic and move choice remains yours.' as const;

interface CandidateExplanationLogger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
}

export interface CandidateExplanationDependencies {
  getCandidateDecision(userId: number, request: CandidateDecisionRequest): Promise<CandidateDecisionResponse>;
  loadConfig(): AiConfig;
  createClient(config: AiConfig, logger?: CandidateExplanationLogger): OpenAiCompatibleLlmClient;
  now(): Date;
}

const defaultDependencies: CandidateExplanationDependencies = {
  getCandidateDecision: (userId, request) =>
    CandidateDecisionOpponentPreparationService.get(userId, request),
  loadConfig: loadAiConfig,
  createClient: (config, logger) => new OpenAiCompatibleLlmClient(config, fetch, logger),
  now: () => new Date(),
};

export function createCandidateExplanationService(
  dependencies: Partial<CandidateExplanationDependencies> = {},
) {
  const deps = { ...defaultDependencies, ...dependencies };

  return {
    async generate(
      userId: number,
      request: AiBuilderCandidateExplanationRequest,
      logger?: CandidateExplanationLogger,
    ): Promise<AiBuilderCandidateExplanationResponse> {
      const config = deps.loadConfig();
      ensureFeatureEnabled(config);
      if (!config.configured) {
        throw new AiFeatureError(503, 'AI_PROVIDER_UNAVAILABLE', 'AI provider is not configured.');
      }

      const authoritativeRequest: CandidateDecisionRequest = {
        ...request.decisionRequest,
        candidateLimit: 8,
        includeMoveUci: request.identity.selectedMoveUci,
      };

      let response: CandidateDecisionResponse;
      try {
        response = await deps.getCandidateDecision(userId, authoritativeRequest);
      } catch {
        throw new AiFeatureError(409, 'AI_CONTEXT_INVALID', 'Candidate evidence could not be rebuilt.');
      }

      assertIdentity(request, response);
      const selected = findCandidate(response, request.identity.selectedMoveUci, 'selected');
      const comparison = request.identity.comparisonMoveUci
        ? findCandidate(response, request.identity.comparisonMoveUci, 'comparison')
        : null;
      if (comparison?.moveUci === selected.moveUci) {
        throw new AiFeatureError(409, 'AI_CONTEXT_INVALID', 'Comparison candidate must differ from the selected candidate.');
      }

      const context = buildCandidateExplanationContext(response, selected, comparison);
      const generated = await deps.createClient(config, logger).generateJson({
        useCase: 'builder-candidate-explanation',
        systemPrompt: BUILDER_CANDIDATE_EXPLANATION_SYSTEM_PROMPT,
        input: {
          selectedCandidate: candidateIdentity(selected),
          comparisonCandidate: comparison ? candidateIdentity(comparison) : null,
          facts: context.facts,
        },
        outputSchema: aiBuilderCandidateExplanationContentSchema,
        maxOutputTokens: 900,
      });
      const explanation = context.reconcile(generated.value);

      return aiBuilderCandidateExplanationResponseSchema.parse({
        kind: 'BUILDER_CANDIDATE_EXPLANATION',
        schemaVersion: SCHEMA_VERSION,
        generatedAt: deps.now().toISOString(),
        identity: request.identity,
        selectedCandidate: candidateIdentity(selected),
        comparisonCandidate: comparison ? candidateIdentity(comparison) : null,
        explanation,
        referencedFacts: context.referencedFacts(explanation),
        disclaimer: DISCLAIMER,
      });
    },
  };
}

function ensureFeatureEnabled(config: AiConfig): void {
  if (!config.enabled || !config.builderCandidateExplanationEnabled) {
    throw new AiFeatureError(404, 'AI_WIDGET_DISABLED', 'Builder candidate explanation is disabled.');
  }
}

function assertIdentity(
  request: AiBuilderCandidateExplanationRequest,
  response: CandidateDecisionResponse,
): void {
  const identity = request.identity;
  if (request.decisionRequest.target.targetId !== identity.targetId
    || response.targetId !== identity.targetId
    || response.normalizedFen !== identity.normalizedFen
    || response.decisionRole !== identity.decisionRole
    || response.rankingPolicyVersion !== identity.rankingPolicyVersion) {
    throw new AiFeatureError(409, 'AI_CONTEXT_STALE', 'Candidate evidence changed before the explanation was generated.');
  }
}

function findCandidate(
  response: CandidateDecisionResponse,
  moveUci: string,
  kind: 'selected' | 'comparison',
): CandidateDecisionCandidate {
  const candidate = response.candidates.find((item) => item.moveUci === moveUci);
  if (!candidate) {
    throw new AiFeatureError(409, 'AI_CONTEXT_STALE', `The ${kind} candidate is no longer available.`);
  }
  return candidate;
}

function candidateIdentity(candidate: CandidateDecisionCandidate) {
  return {
    moveUci: candidate.moveUci,
    moveSan: candidate.moveSan,
    rank: candidate.rank,
  };
}

export const CandidateExplanationService = createCandidateExplanationService();
