import assert from 'node:assert/strict';
import {
  CANDIDATE_DECISION_CONTRACT_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
} from '@chess-trainer/contracts/candidate-decision';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { AiFeatureError } from '../../dist/modules/ai/ai.errors.js';
import { createCandidateExplanationService } from '../../dist/modules/ai/repertoire-builder/candidate-explanation/candidate-explanation.service.js';

const normalizedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const target = newCourseRepertoireTargetExample;
const response = {
  contractVersion: CANDIDATE_DECISION_CONTRACT_VERSION,
  rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
  generatedAt: '2026-07-30T14:55:00.000Z',
  targetId: target.targetId,
  decisionRole: 'USER_MOVE',
  fen: `${normalizedFen} 0 1`,
  normalizedFen,
  sideToMove: 'WHITE',
  legalMoveCount: 20,
  returnedCandidateCount: 2,
  omittedLegalMoveCount: 18,
  requestedMoveIncluded: true,
  sourceSummary: {
    engine: 'AVAILABLE',
    masters: 'AVAILABLE',
    population: 'AVAILABLE',
    personal: 'INSUFFICIENT',
    opening: 'AVAILABLE',
    courses: 'AVAILABLE',
    playerProfile: 'UNAVAILABLE',
  },
  candidates: [
    candidate(1, 'e2e4', 'e4', 31, 28, ['ENGINE_BEST', 'POPULATION_COMMON']),
    candidate(2, 'd2d4', 'd4', 24, 19, ['ENGINE_CLOSE']),
  ],
};

const request = {
  decisionRequest: {
    fen: `${normalizedFen} 0 1`,
    decisionRole: 'USER_MOVE',
    target,
    candidateLimit: 6,
  },
  identity: {
    targetId: target.targetId,
    normalizedFen,
    decisionRole: 'USER_MOVE',
    rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
    responseGeneratedAt: response.generatedAt,
    selectedMoveUci: 'e2e4',
    comparisonMoveUci: 'd2d4',
  },
};

const enabledConfig = {
  enabled: true,
  gameReviewEnabled: false,
  builderCandidateExplanationEnabled: true,
  provider: 'openai-compatible',
  baseUrl: 'https://api.deepseek.test',
  model: 'deepseek-v4-flash',
  apiKey: 'secret',
  timeoutMs: 1000,
  maxRetries: 0,
  thinkingMode: 'disabled',
  reasoningEffort: undefined,
  debugLogging: false,
  configured: true,
};

{
  let contextCalls = 0;
  const service = createCandidateExplanationService({
    loadConfig: () => ({ ...enabledConfig, builderCandidateExplanationEnabled: false }),
    getCandidateDecision: async () => {
      contextCalls += 1;
      return response;
    },
  });

  await assert.rejects(
    () => service.generate(1, request),
    (error) => error.code === 'AI_WIDGET_DISABLED',
  );
  assert.equal(contextCalls, 0, 'disabled capability performs no candidate or provider work');
}

{
  let authoritativeRequest = null;
  let providerInput = null;
  const originalResponse = structuredClone(response);
  const service = createCandidateExplanationService({
    loadConfig: () => enabledConfig,
    getCandidateDecision: async (_userId, input) => {
      authoritativeRequest = input;
      return response;
    },
    createClient: () => ({
      generateJson: async (input) => {
        providerInput = input.input;
        return {
          value: {
            summary: 'The supplied facts show deterministic ranks and target-population frequencies.',
            tradeoffs: [{
              text: 'The supplied target-population frequencies are 28% for the selected move and 19% for the comparison move.',
              evidenceReferenceIds: ['selected.population_frequency', 'comparison.population_frequency'],
            }],
            evidenceReferenceIds: ['selected.rank', 'comparison.rank', 'selected.population_frequency'],
            missingEvidenceReferenceId: 'source.playerprofile',
          },
          usage: { promptTokens: 1, completionTokens: 1 },
        };
      },
    }),
    now: () => new Date('2026-07-30T15:00:00.000Z'),
  });

  const generated = await service.generate(7, request);
  assert.equal(authoritativeRequest.candidateLimit, 8);
  assert.equal(authoritativeRequest.includeMoveUci, 'e2e4');
  assert.equal(providerInput.normalizedFen, undefined, 'FEN is not sent to the provider');
  assert.equal(providerInput.facts.some((fact) => fact.id === 'selected.rank'), true);
  assert.equal(providerInput.facts.some((fact) => fact.id.includes('opening_knowledge')), false);
  assert.equal(generated.selectedCandidate.rank, 1);
  assert.equal(generated.comparisonCandidate.rank, 2);
  assert.equal(generated.generatedAt, '2026-07-30T15:00:00.000Z');
  assert.equal(generated.referencedFacts.some((fact) => fact.id === 'source.playerprofile' && fact.missing), true);
  assert.equal(generated.disclaimer, 'Candidate ranking remains deterministic and move choice remains yours.');
  assert.deepEqual(response, originalResponse, 'explanation generation does not mutate deterministic candidate state');
}

{
  let providerCalls = 0;
  const service = createCandidateExplanationService({
    loadConfig: () => enabledConfig,
    getCandidateDecision: async () => response,
    createClient: () => ({
      generateJson: async () => {
        providerCalls += 1;
        return {
          value: {
            summary: 'Unsupported evidence.',
            tradeoffs: [],
            evidenceReferenceIds: ['selected.unsupported'],
            missingEvidenceReferenceId: null,
          },
          usage: { promptTokens: 1, completionTokens: 1 },
        };
      },
    }),
  });

  await assert.rejects(
    () => service.generate(1, request),
    (error) => error.code === 'AI_INVALID_RESPONSE',
  );
  assert.equal(providerCalls, 1);
}

{
  const service = createCandidateExplanationService({
    loadConfig: () => enabledConfig,
    getCandidateDecision: async () => response,
    createClient: () => ({
      generateJson: async () => ({
        value: {
          summary: 'The selected move causes a winning attack.',
          tradeoffs: [],
          evidenceReferenceIds: ['selected.engine_score'],
          missingEvidenceReferenceId: null,
        },
        usage: { promptTokens: 1, completionTokens: 1 },
      }),
    }),
  });

  await assert.rejects(
    () => service.generate(1, request),
    (error) => error.code === 'AI_INVALID_RESPONSE',
  );
}

{
  let providerCalls = 0;
  const staleRequest = {
    ...request,
    identity: { ...request.identity, normalizedFen: '8/8/8/8/8/8/8/8 w - -' },
  };
  const service = createCandidateExplanationService({
    loadConfig: () => enabledConfig,
    getCandidateDecision: async () => response,
    createClient: () => ({
      generateJson: async () => {
        providerCalls += 1;
        throw new Error('must not run');
      },
    }),
  });

  await assert.rejects(
    () => service.generate(1, staleRequest),
    (error) => error.code === 'AI_CONTEXT_STALE',
  );
  assert.equal(providerCalls, 0, 'stale authoritative identity is rejected before provider work');
}

{
  const service = createCandidateExplanationService({
    loadConfig: () => enabledConfig,
    getCandidateDecision: async () => response,
    createClient: () => ({
      generateJson: async () => {
        throw new AiFeatureError(504, 'AI_PROVIDER_TIMEOUT', 'AI provider request timed out.');
      },
    }),
  });

  await assert.rejects(
    () => service.generate(1, request),
    (error) => error.code === 'AI_PROVIDER_TIMEOUT',
  );
}

function candidate(rank, moveUci, moveSan, engineScore, populationFrequency, reasonCodes) {
  return {
    rank,
    moveUci,
    moveSan,
    resultingFen: `${normalizedFen} 0 1`,
    previewUci: [moveUci],
    manuallyRequested: false,
    eligibility: { status: 'ELIGIBLE', reasonCodes, warningCodes: [] },
    targetFit: { status: 'ALIGNED', reasonCodes: [] },
    profileFit: { status: 'UNKNOWN', reasonCodes: [] },
    components: {
      objective: 0,
      population: 0,
      masters: 0,
      personal: 0,
      targetFit: 0,
      profileFit: 0,
      course: 0,
    },
    reasonCodes,
    warningCodes: [],
    coverage: null,
    evidence: {
      engine: {
        status: 'AVAILABLE',
        depth: 18,
        multipv: rank,
        scoreCpForTarget: engineScore,
        mateForTarget: null,
        objectiveDeltaCp: rank === 1 ? 0 : 7,
        pvUci: [moveUci],
      },
      masters: corpusEvidence(120, populationFrequency + 4),
      population: corpusEvidence(200, populationFrequency),
      personal: {
        status: 'INSUFFICIENT',
        occurrences: 0,
        games: 0,
        scorePercent: null,
      },
      opening: {
        status: 'AVAILABLE',
        opening: { eco: 'A00', name: 'Test opening' },
        classificationVersion: '2026-07-rules-v2',
        side: 'WHITE',
        soundness: 'SOUND',
        character: ['BALANCED'],
        theoreticalStatus: 'MAINLINE',
        theoryBurden: 'MEDIUM',
        roles: ['INITIATOR'],
        confidence: 'HIGH',
        matchedRuleIds: ['test-rule'],
        knowledge: {
          status: 'AVAILABLE',
          version: '2026-08-knowledge-v1',
          shortDescription: { text: 'A reviewed opening description.', confidence: 'HIGH' },
          strategicSummary: { text: 'A reviewed target-side summary.', confidence: 'HIGH' },
          plans: [{
            id: `${moveUci}-plan`,
            title: 'Reviewed plan',
            summary: 'This remains deterministic explanatory evidence.',
            conditions: [],
            caveats: [],
            confidence: 'HIGH',
          }],
          matchedRuleIds: ['knowledge-test-rule'],
          sourceIds: ['project-editorial-rb-022'],
        },
      },
      course: {
        status: 'AVAILABLE',
        covered: false,
        conflict: false,
        transposesToCoveredPosition: false,
        references: [],
      },
      playerProfile: {
        status: 'UNAVAILABLE',
        generatedAt: null,
        matches: [],
      },
    },
  };
}

function corpusEvidence(games, frequencyPercent) {
  return {
    status: 'AVAILABLE',
    games,
    frequencyPercent,
    scorePercentForTarget: 52,
    averageRating: 1800,
    datasetVersion: 'test-v1',
    fetchedAt: '2026-07-30T14:00:00.000Z',
    representativeGameId: null,
  };
}

console.log('AI Builder candidate explanation tests passed.');
