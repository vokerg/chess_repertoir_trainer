import {
  aiBuilderCandidateExplanationContentSchema,
  aiBuilderCandidateExplanationResponseSchema,
  type AiBuilderCandidateExplanationContent,
  type AiBuilderCandidateExplanationFact,
  type AiBuilderCandidateExplanationRequest,
  type AiBuilderCandidateExplanationResponse,
} from '@chess-trainer/contracts/ai';
import type {
  CandidateDecisionCandidate,
  CandidateDecisionRequest,
  CandidateDecisionResponse,
  CandidateEvidenceStatus,
} from '@chess-trainer/contracts/candidate-decision';
import { CandidateDecisionService } from '../../../candidate-decision/candidate-decision.service';
import { loadAiConfig, type AiConfig } from '../../ai.config';
import { AiFeatureError } from '../../ai.errors';
import { OpenAiCompatibleLlmClient } from '../../openai-compatible-llm.client';
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
  getCandidateDecision: (userId, request) => CandidateDecisionService.get(userId, request),
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
        includeMoveUci: request.identity.comparisonMoveUci ?? request.identity.selectedMoveUci,
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

      const facts = buildFacts(response, selected, comparison);
      const factsById = new Map(facts.map((fact) => [fact.id, fact]));
      const generated = await deps.createClient(config, logger).generateJson({
        useCase: 'builder-candidate-explanation',
        systemPrompt: BUILDER_CANDIDATE_EXPLANATION_SYSTEM_PROMPT,
        input: {
          selectedCandidate: candidateIdentity(selected),
          comparisonCandidate: comparison ? candidateIdentity(comparison) : null,
          facts,
        },
        outputSchema: aiBuilderCandidateExplanationContentSchema,
        maxOutputTokens: 900,
      });

      const explanation = reconcileExplanation(
        generated.value,
        factsById,
        new Set([selected.moveUci, comparison?.moveUci].filter(isString)),
      );
      const referencedFacts = collectReferencedFacts(explanation, factsById);

      return aiBuilderCandidateExplanationResponseSchema.parse({
        kind: 'BUILDER_CANDIDATE_EXPLANATION',
        schemaVersion: SCHEMA_VERSION,
        generatedAt: deps.now().toISOString(),
        identity: request.identity,
        selectedCandidate: candidateIdentity(selected),
        comparisonCandidate: comparison ? candidateIdentity(comparison) : null,
        explanation,
        referencedFacts,
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

function buildFacts(
  response: CandidateDecisionResponse,
  selected: CandidateDecisionCandidate,
  comparison: CandidateDecisionCandidate | null,
): AiBuilderCandidateExplanationFact[] {
  const facts = new Map<string, AiBuilderCandidateExplanationFact>();
  const add = (fact: AiBuilderCandidateExplanationFact) => facts.set(fact.id, fact);

  for (const [source, status] of Object.entries(response.sourceSummary)) {
    add({
      id: `source.${source.toLowerCase()}`,
      label: `${humanize(source)} source`,
      value: humanize(status),
      missing: status !== 'AVAILABLE',
    });
  }

  addCandidateFacts(add, 'selected', selected);
  if (comparison) addCandidateFacts(add, 'comparison', comparison);
  return [...facts.values()];
}

function addCandidateFacts(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  prefix: 'selected' | 'comparison',
  candidate: CandidateDecisionCandidate,
): void {
  addFact(add, `${prefix}.move`, `${humanize(prefix)} move`, `${candidate.moveSan} (${candidate.moveUci})`);
  addFact(add, `${prefix}.rank`, `${humanize(prefix)} deterministic rank`, `#${candidate.rank}`);
  addFact(add, `${prefix}.eligibility`, `${humanize(prefix)} eligibility`, humanize(candidate.eligibility.status));
  addFact(add, `${prefix}.target_fit`, `${humanize(prefix)} target fit`, humanize(candidate.targetFit.status));
  addFact(add, `${prefix}.profile_fit`, `${humanize(prefix)} profile fit`, humanize(candidate.profileFit.status));

  for (const code of candidate.reasonCodes) {
    addFact(add, `${prefix}.reason.${code.toLowerCase()}`, `${humanize(prefix)} reason`, humanize(code));
  }
  for (const code of candidate.warningCodes) {
    addFact(add, `${prefix}.warning.${code.toLowerCase()}`, `${humanize(prefix)} warning`, humanize(code));
  }

  const engine = candidate.evidence.engine;
  addStatusFact(add, `${prefix}.engine_status`, `${humanize(prefix)} engine evidence`, engine.status);
  if (engine.scoreCpForTarget !== null) {
    addFact(add, `${prefix}.engine_score`, `${humanize(prefix)} engine score`, formatCentipawns(engine.scoreCpForTarget));
  }
  if (engine.depth !== null) {
    addFact(add, `${prefix}.engine_depth`, `${humanize(prefix)} engine depth`, String(engine.depth));
  }

  addCorpusFacts(add, prefix, 'population', candidate.evidence.population);
  addCorpusFacts(add, prefix, 'masters', candidate.evidence.masters);

  const personal = candidate.evidence.personal;
  addStatusFact(add, `${prefix}.personal_status`, `${humanize(prefix)} personal evidence`, personal.status);
  if (personal.occurrences > 0) {
    addFact(add, `${prefix}.personal_occurrences`, `${humanize(prefix)} personal occurrences`, String(personal.occurrences));
  }
  if (personal.scorePercent !== null) {
    addFact(add, `${prefix}.personal_score`, `${humanize(prefix)} personal score`, formatPercent(personal.scorePercent));
  }

  const opening = candidate.evidence.opening;
  addStatusFact(add, `${prefix}.opening_status`, `${humanize(prefix)} opening evidence`, opening.status);
  if (opening.opening) {
    addFact(add, `${prefix}.opening_name`, `${humanize(prefix)} opening`, opening.opening.name);
  }

  const course = candidate.evidence.course;
  addStatusFact(add, `${prefix}.course_status`, `${humanize(prefix)} course evidence`, course.status);
  addFact(
    add,
    `${prefix}.course_state`,
    `${humanize(prefix)} course state`,
    course.conflict ? 'Conflict' : course.covered ? 'Covered' : course.transposesToCoveredPosition ? 'Transposes to coverage' : 'New',
  );

  addStatusFact(
    add,
    `${prefix}.player_profile_status`,
    `${humanize(prefix)} player profile evidence`,
    candidate.evidence.playerProfile.status,
  );

  if (candidate.coverage?.contributionPercent !== null && candidate.coverage?.contributionPercent !== undefined) {
    addFact(
      add,
      `${prefix}.coverage_contribution`,
      `${humanize(prefix)} coverage contribution`,
      formatPercent(candidate.coverage.contributionPercent),
    );
  }
}

function addCorpusFacts(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  prefix: 'selected' | 'comparison',
  source: 'population' | 'masters',
  evidence: CandidateDecisionCandidate['evidence']['population'],
): void {
  addStatusFact(add, `${prefix}.${source}_status`, `${humanize(prefix)} ${source} evidence`, evidence.status);
  if (evidence.games > 0) addFact(add, `${prefix}.${source}_games`, `${humanize(prefix)} ${source} games`, String(evidence.games));
  if (evidence.frequencyPercent !== null) {
    addFact(add, `${prefix}.${source}_frequency`, `${humanize(prefix)} ${source} frequency`, formatPercent(evidence.frequencyPercent));
  }
  if (evidence.scorePercentForTarget !== null) {
    addFact(add, `${prefix}.${source}_score`, `${humanize(prefix)} ${source} score`, formatPercent(evidence.scorePercentForTarget));
  }
}

function addStatusFact(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  id: string,
  label: string,
  status: CandidateEvidenceStatus,
): void {
  add({ id, label, value: humanize(status), missing: status !== 'AVAILABLE' });
}

function addFact(
  add: (fact: AiBuilderCandidateExplanationFact) => void,
  id: string,
  label: string,
  value: string,
): void {
  add({ id, label, value, missing: false });
}

function reconcileExplanation(
  explanation: AiBuilderCandidateExplanationContent,
  factsById: ReadonlyMap<string, AiBuilderCandidateExplanationFact>,
  allowedMoves: ReadonlySet<string>,
): AiBuilderCandidateExplanationContent {
  const referenceIds = [
    ...explanation.evidenceReferenceIds,
    ...explanation.tradeoffs.flatMap((tradeoff) => tradeoff.evidenceReferenceIds),
    ...(explanation.missingEvidenceReferenceId ? [explanation.missingEvidenceReferenceId] : []),
  ];
  if (referenceIds.length === 0) {
    throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI explanation did not reference authoritative evidence.');
  }
  for (const referenceId of referenceIds) {
    if (!factsById.has(referenceId)) {
      throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI explanation referenced unsupported evidence.');
    }
  }
  if (explanation.missingEvidenceReferenceId
    && !factsById.get(explanation.missingEvidenceReferenceId)?.missing) {
    throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI explanation marked available evidence as missing.');
  }

  const text = [explanation.summary, ...explanation.tradeoffs.map((tradeoff) => tradeoff.text)].join(' ');
  if (/\b(i recommend|you should|you must|must play|choose this|pick this|the move to play)\b/i.test(text)) {
    throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI explanation attempted to recommend a move.');
  }
  const mentionedMoves = text.match(/\b[a-h][1-8][a-h][1-8][qrbn]?\b/gi) ?? [];
  if (mentionedMoves.some((move) => !allowedMoves.has(move.toLowerCase()))) {
    throw new AiFeatureError(502, 'AI_INVALID_RESPONSE', 'AI explanation referenced an unsupported move.');
  }

  return explanation;
}

function collectReferencedFacts(
  explanation: AiBuilderCandidateExplanationContent,
  factsById: ReadonlyMap<string, AiBuilderCandidateExplanationFact>,
): AiBuilderCandidateExplanationFact[] {
  const ids = new Set([
    ...explanation.evidenceReferenceIds,
    ...explanation.tradeoffs.flatMap((tradeoff) => tradeoff.evidenceReferenceIds),
    ...(explanation.missingEvidenceReferenceId ? [explanation.missingEvidenceReferenceId] : []),
  ]);
  return [...ids].map((id) => factsById.get(id)).filter(isFact);
}

function candidateIdentity(candidate: CandidateDecisionCandidate) {
  return {
    moveUci: candidate.moveUci,
    moveSan: candidate.moveSan,
    rank: candidate.rank,
  };
}

function formatCentipawns(score: number): string {
  const pawns = score / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

function humanize(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string';
}

function isFact(value: AiBuilderCandidateExplanationFact | undefined): value is AiBuilderCandidateExplanationFact {
  return value !== undefined;
}

export const CandidateExplanationService = createCandidateExplanationService();
