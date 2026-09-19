import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { AiFeatureError } from '../../dist/modules/ai/ai.errors.js';
import { createCompletionSummaryService } from '../../dist/modules/ai/repertoire-builder/completion-summary/completion-summary.service.js';

const target = newCourseRepertoireTargetExample;
const draft = {
  draftVersion: '2026-07-v1',
  sessionModelVersion: '2026-07-v1',
  sessionId: 'session-rb020',
  ownerId: '7',
  sessionRevision: 9,
  sessionLifecycle: 'COMPLETED',
  targetRevision: 1,
  targetContractVersion: target.contractVersion,
  targetId: target.targetId,
  targetCapturedAt: '2026-07-30T18:00:00.000+00:00',
  target,
  repertoireSide: target.side,
  startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  analysisTree: {
    rootFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    children: [{
      moveUci: 'e2e4',
      children: [{ moveUci: 'e7e5', children: [] }],
    }],
  },
  materializedDecisionCount: 2,
  materializedMoveCount: 2,
  transpositionLeafCount: 0,
  excludedBranches: [{
    branchId: 'branch-deferred',
    pathUci: ['d2d4'],
    status: 'DEFERRED',
    reason: 'DEFERRED',
  }],
};

const applyResult = {
  contractVersion: '2026-07-v1',
  targetKind: 'NEW_LINE',
  courseId: 11,
  chapterId: 22,
  lineId: 33,
  lineName: 'Reviewed line',
  createdMoves: 2,
  reusedMoves: 0,
  skippedBranches: 1,
  conflictingMoves: 0,
  totalDraftMoves: 2,
  courseContentRevision: 8,
  idempotent: false,
};

const request = {
  draft,
  destination: {
    courseId: 11,
    courseName: 'White repertoire',
    chapterId: 22,
    chapterName: 'Open games',
  },
  selectedTarget: { kind: 'NEW_LINE', name: 'Reviewed line' },
  applyResult,
};

const destination = request.destination;
const enabledConfig = {
  enabled: true,
  gameReviewEnabled: false,
  builderCandidateExplanationEnabled: false,
  builderCompletionSummaryEnabled: true,
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
  let destinationCalls = 0;
  let providerCalls = 0;
  const service = createCompletionSummaryService({
    loadConfig: () => ({ ...enabledConfig, builderCompletionSummaryEnabled: false }),
    loadDestination: async () => {
      destinationCalls += 1;
      return destination;
    },
    createClient: () => ({
      generateJson: async () => {
        providerCalls += 1;
        throw new Error('must not run');
      },
    }),
  });

  await assert.rejects(
    () => service.generate(7, request),
    (error) => error.code === 'AI_WIDGET_DISABLED',
  );
  assert.equal(destinationCalls, 0);
  assert.equal(providerCalls, 0, 'disabled capability performs no context or provider work');
}

{
  let providerInput = null;
  const originalRequest = structuredClone(request);
  const service = createCompletionSummaryService({
    loadConfig: () => enabledConfig,
    loadDestination: async () => destination,
    createClient: () => ({
      generateJson: async (input) => {
        providerInput = input.input;
        return {
          value: {
            interpretation: 'The verified result records two created moves in the applied line.',
            interpretationReferenceIds: ['result.created_moves', 'result.line'],
            highlights: [{
              text: 'The applied path contains e2e4 e7e5.',
              evidenceReferenceIds: ['path.1'],
            }],
            studyChecklist: [{
              text: 'Review the supplied applied path e2e4 e7e5.',
              evidenceReferenceIds: ['path.1'],
            }],
            unresolvedWorkNote: {
              text: 'One deferred branch remains excluded from the course update.',
              evidenceReferenceIds: ['result.skipped_branches', 'excluded.1', 'result.destination'],
            },
            warning: null,
          },
          usage: { promptTokens: 1, completionTokens: 1 },
        };
      },
    }),
    now: () => new Date('2026-07-30T19:00:00.000Z'),
  });

  const generated = await service.generate(7, request);
  assert.equal(providerInput.draft, undefined, 'complete draft is not sent to the provider');
  assert.equal(providerInput.destination, undefined, 'raw destination input is not sent to the provider');
  assert.equal(providerInput.facts.some((fact) => fact.id === 'result.created_moves'), true);
  assert.equal(providerInput.facts.some((fact) => fact.id === 'path.1' && fact.value === 'e2e4 e7e5'), true);
  assert.equal(generated.authoritativeResult.courseName, 'White repertoire');
  assert.equal(generated.authoritativeResult.createdMoves, 2);
  assert.equal(generated.identity.sessionId, draft.sessionId);
  assert.equal(generated.generatedAt, '2026-07-30T19:00:00.000Z');
  assert.equal(generated.referencedFacts.some((fact) => fact.id === 'excluded.1'), true);
  assert.equal(generated.disclaimer, 'Course changes are authoritative; generated study suggestions are optional.');
  assert.deepEqual(request, originalRequest, 'summary generation does not mutate the completed draft or result');
}

{
  let destinationCalls = 0;
  let providerCalls = 0;
  const invalidRequest = {
    ...request,
    applyResult: { ...applyResult, createdMoves: 1 },
  };
  const service = createCompletionSummaryService({
    loadConfig: () => enabledConfig,
    loadDestination: async () => {
      destinationCalls += 1;
      return destination;
    },
    createClient: () => ({
      generateJson: async () => {
        providerCalls += 1;
        throw new Error('must not run');
      },
    }),
  });

  await assert.rejects(
    () => service.generate(7, invalidRequest),
    (error) => error.code === 'AI_CONTEXT_INVALID',
  );
  assert.equal(destinationCalls, 0, 'invalid authoritative counts fail before repository reads');
  assert.equal(providerCalls, 0);
}

{
  let providerCalls = 0;
  const service = createCompletionSummaryService({
    loadConfig: () => enabledConfig,
    loadDestination: async () => {
      throw new AiFeatureError(409, 'AI_CONTEXT_STALE', 'Applied result changed.');
    },
    createClient: () => ({
      generateJson: async () => {
        providerCalls += 1;
        throw new Error('must not run');
      },
    }),
  });

  await assert.rejects(
    () => service.generate(7, request),
    (error) => error.code === 'AI_CONTEXT_STALE',
  );
  assert.equal(providerCalls, 0, 'stale destination is rejected before provider work');
}

{
  const service = createCompletionSummaryService({
    loadConfig: () => enabledConfig,
    loadDestination: async () => destination,
    createClient: () => ({
      generateJson: async () => ({
        value: {
          interpretation: 'Unsupported evidence.',
          interpretationReferenceIds: ['result.unsupported'],
          highlights: [],
          studyChecklist: [],
          unresolvedWorkNote: null,
          warning: null,
        },
        usage: { promptTokens: 1, completionTokens: 1 },
      }),
    }),
  });

  await assert.rejects(
    () => service.generate(7, request),
    (error) => error.code === 'AI_INVALID_RESPONSE',
  );
}

{
  const service = createCompletionSummaryService({
    loadConfig: () => enabledConfig,
    loadDestination: async () => destination,
    createClient: () => ({
      generateJson: async () => ({
        value: {
          interpretation: 'The deferred branch was applied to the course.',
          interpretationReferenceIds: ['excluded.1', 'result.destination'],
          highlights: [],
          studyChecklist: [],
          unresolvedWorkNote: null,
          warning: null,
        },
        usage: { promptTokens: 1, completionTokens: 1 },
      }),
    }),
  });

  await assert.rejects(
    () => service.generate(7, request),
    (error) => error.code === 'AI_INVALID_RESPONSE',
  );
}

{
  const service = createCompletionSummaryService({
    loadConfig: () => enabledConfig,
    loadDestination: async () => destination,
    createClient: () => ({
      generateJson: async () => {
        throw new AiFeatureError(504, 'AI_PROVIDER_TIMEOUT', 'AI provider request timed out.');
      },
    }),
  });

  await assert.rejects(
    () => service.generate(7, request),
    (error) => error.code === 'AI_PROVIDER_TIMEOUT',
  );
}

console.log('AI Builder completion summary tests passed.');