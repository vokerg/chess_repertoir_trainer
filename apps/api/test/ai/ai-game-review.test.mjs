import assert from 'node:assert/strict';
import { z } from 'zod';
import { loadAiConfig } from '../../dist/modules/ai/ai.config.js';
import { OpenAiCompatibleLlmClient } from '../../dist/modules/ai/openai-compatible-llm.client.js';
import { buildGameReviewContext } from '../../dist/modules/ai/game-review/game-review-context.js';
import { createGameReviewService } from '../../dist/modules/ai/game-review/game-review.service.js';

const config = {
  enabled: true,
  gameReviewEnabled: true,
  provider: 'openai-compatible',
  baseUrl: 'https://api.deepseek.test',
  model: 'deepseek-v4-flash',
  apiKey: 'secret',
  timeoutMs: 1000,
  maxRetries: 1,
  thinkingMode: 'disabled',
  reasoningEffort: undefined,
  debugLogging: false,
  configured: true,
};

assert.equal(loadAiConfig({ AI_WIDGETS_ENABLED: 'false' }).configured, false);
assert.deepEqual(loadAiConfig({
  AI_WIDGETS_ENABLED: 'true',
  AI_GAME_REVIEW_ENABLED: 'true',
  LLM_PROVIDER: 'openai-compatible',
  LLM_BASE_URL: 'https://api.deepseek.test/',
  LLM_MODEL: 'deepseek-v4-flash',
  LLM_API_KEY: 'key',
  LLM_THINKING_MODE: 'enabled',
  LLM_REASONING_EFFORT: 'max',
}).reasoningEffort, 'max');

{
  const bodies = [];
  let calls = 0;
  const client = new OpenAiCompatibleLlmClient(config, async (_url, init) => {
    calls += 1;
    bodies.push(JSON.parse(init.body));
    if (calls === 1) {
      return new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ summary: 'Useful review' }) } }],
      usage: { prompt_tokens: 10, completion_tokens: 4 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  const result = await client.generateJson({
    useCase: 'test',
    systemPrompt: 'Return JSON.',
    input: { game: 1 },
    outputSchema: z.object({ summary: z.string() }),
    maxOutputTokens: 100,
  });

  assert.equal(calls, 2, 'empty content is retried once');
  assert.equal(result.value.summary, 'Useful review');
  assert.deepEqual(bodies[0].thinking, { type: 'disabled' });
  assert.equal(bodies[0].temperature, 0.2);
  assert.deepEqual(bodies[0].response_format, { type: 'json_object' });
}

{
  let calls = 0;
  const client = new OpenAiCompatibleLlmClient(config, async () => {
    calls += 1;
    return new Response('{}', { status: 401 });
  });
  await assert.rejects(
    () => client.generateJson({
      useCase: 'test',
      systemPrompt: 'Return JSON.',
      input: {},
      outputSchema: z.object({ ok: z.boolean() }),
      maxOutputTokens: 100,
    }),
    (error) => error.code === 'AI_PROVIDER_ERROR',
  );
  assert.equal(calls, 1, 'provider authentication errors are not retried');
}

const game = {
  id: 7,
  accountId: 2,
  provider: 'LICHESS',
  providerGameId: 'game-7',
  providerUrl: null,
  endedAt: '2026-07-19T10:00:00.000Z',
  startedAt: null,
  speedCategory: 'blitz',
  rated: true,
  variant: 'standard',
  timeControl: { raw: '300+0', initial: 300, increment: 0 },
  white: { username: 'User', rating: 1600 },
  black: { username: 'Opponent', rating: 1650 },
  userColor: 'WHITE',
  opponentUsername: 'Opponent',
  result: '1-0',
  resultForUser: 'WIN',
  status: 'finished',
  opening: { eco: 'C11', name: 'French Defense: Classical Variation' },
  tagCodes: [1],
  tags: [{ code: 1, name: 'Tactical game' }],
  plyIndex: { status: 'INDEXED', indexedAt: null, error: null },
  analysis: {
    status: 'COMPLETED', runId: 1, depth: null, completedAt: null, createdAt: null,
    whiteAccuracy: 88, blackAccuracy: 79, userAccuracy: 88, summary: null, criticalMoveCount: 1,
  },
  pgn: '[Result "1-0"]\n\n1. e4 e6 2. d4 d5 3. Nc3 Nf6 1-0',
  plies: [],
  createdAt: '2026-07-19T10:00:00.000Z',
  updatedAt: '2026-07-19T10:00:00.000Z',
};

const run = {
  id: 19,
  status: 'COMPLETED',
  completedAt: '2026-07-19T10:05:00.000Z',
  whiteAccuracy: 88,
  blackAccuracy: 79,
  whiteAverageCentipawnLoss: 22,
  blackAverageCentipawnLoss: 39,
  summary: { criticalPlyNumbers: [3] },
  moves: [
    move(1, 'WHITE', 'e2e4', 'BEST', 0, 'e2e4'),
    move(2, 'BLACK', 'e7e6', 'GOOD', 8, 'e7e6'),
    move(3, 'WHITE', 'd2d4', 'MISTAKE', 95, 'g1f3'),
    move(4, 'BLACK', 'd7d5', 'BEST', 0, 'd7d5'),
    move(5, 'WHITE', 'b1c3', 'GOOD', 5, 'b1c3'),
    move(6, 'BLACK', 'g8f6', 'BEST', 0, 'g8f6'),
  ],
};

{
  const built = buildGameReviewContext(game, run);
  assert.equal(built.authoritativeMoves.get(3).playedMoveSan, 'd4');
  assert.equal(built.authoritativeMoves.get(3).bestMoveSan, 'Nf3');
  assert.equal(built.context.moves[0].before, undefined, 'FEN is not included in provider context');
  assert.equal(built.context.openingKnowledge.side, 'WHITE');
  assert.equal(built.context.openingKnowledge.version, '2026-08-knowledge-v2');
  assert.ok(built.context.openingKnowledge.plans.some(
    (plan) => plan.id === 'french-white-use-space-and-pawn-chain',
  ));
  assert.ok(!built.context.openingKnowledge.plans.some(
    (plan) => plan.id === 'french-black-undermine-centre',
  ));
}

{
  const built = buildGameReviewContext({ ...game, userColor: 'BLACK' }, run);
  assert.equal(built.context.openingKnowledge.side, 'BLACK');
  assert.ok(built.context.openingKnowledge.plans.some(
    (plan) => plan.id === 'french-black-undermine-centre',
  ));
  assert.ok(!built.context.openingKnowledge.plans.some(
    (plan) => plan.id === 'french-white-use-space-and-pawn-chain',
  ));
}

{
  const pgnIdentified = {
    ...game,
    opening: { eco: null, name: null },
    pgn: '[Result "*"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 *',
  };
  const built = buildGameReviewContext(pgnIdentified, { ...run, moves: [] });
  assert.equal(built.context.openingKnowledge.opening.source, 'MOVES');
  assert.ok(built.context.openingKnowledge.matchedRuleIds.includes(
    'knowledge-line-najdorf-english-attack',
  ));
  assert.ok(built.context.openingKnowledge.plans.some(
    (plan) => plan.id === 'najdorf-english-white-opposite-wing-attack',
  ));
}

{
  const missingKnowledge = buildGameReviewContext({
    ...game,
    opening: { eco: 'A00', name: 'Invented Opening: Quiet Example' },
    pgn: '[Result "1/2-1/2"]\n\n1/2-1/2',
  }, { ...run, moves: [] });
  assert.equal(missingKnowledge.context.openingKnowledge.status, 'UNAVAILABLE');
  assert.deepEqual(missingKnowledge.context.openingKnowledge.plans, []);
  assert.deepEqual(missingKnowledge.context.openingKnowledge.matchedRuleIds, []);
}

{
  const missingOpening = buildGameReviewContext({
    ...game,
    opening: { eco: null, name: null },
    pgn: '[Result "1/2-1/2"]\n\n1/2-1/2',
  }, { ...run, moves: [] });
  assert.equal(missingOpening.context.openingKnowledge.status, 'UNAVAILABLE');
  assert.equal(missingOpening.context.openingKnowledge.opening, null);
  assert.ok(missingOpening.warnings.includes('OPENING_NOT_IDENTIFIED'));
}

let savedReviewInput = null;
let generatedResponse;
{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => game,
    getAnalysis: async () => ({ run }),
    getStoredReview: async () => null,
    saveStoredReview: async (input) => {
      savedReviewInput = input;
    },
    createClient: () => ({
      generateJson: async ({ input }) => {
        assert.equal(input.openingKnowledge.side, 'WHITE');
        assert.ok(input.openingKnowledge.matchedRuleIds.includes('knowledge-family-french-defense'));
        return {
          value: {
            headline: 'A stable win with one avoidable mistake',
            overview: 'You converted the game after a generally controlled opening.',
            openingAssessment: 'The game followed the reviewed French space plan before one missed developing opportunity.',
            openingPlanReferences: [{
              planId: 'french-white-use-space-and-pawn-chain',
              plyNumber: 3,
              claim: 'MISSED_OPPORTUNITY',
            }],
            turningPoints: [{ plyNumber: 3, explanation: 'This move lost time compared with the engine choice.' }],
            strengths: ['Kept the position under control'],
            improvements: ['Compare candidate developing moves'],
            practicePriorities: ['Opening move-order review'],
            themes: ['development'],
          },
          usage: { promptTokens: 1, completionTokens: 1 },
        };
      },
    }),
    now: () => new Date('2026-07-19T14:00:00.000Z'),
  });

  generatedResponse = await service.generate(1, 7);
  assert.equal(generatedResponse.review.turningPoints[0].classification, 'MISTAKE');
  assert.equal(generatedResponse.review.turningPoints[0].scoreLossCp, 95);
  assert.equal(generatedResponse.review.turningPoints[0].bestMoveSan, 'Nf3');
  assert.equal(generatedResponse.generatedAt, '2026-07-19T14:00:00.000Z');
  assert.equal(savedReviewInput.analysisRunId, 19);
  assert.equal(savedReviewInput.content, generatedResponse);
  assert.equal(savedReviewInput.inputHash.length, 64);
  assert.equal(savedReviewInput.schemaVersion, 1);
  assert.equal(savedReviewInput.promptVersion, 2);
}

{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => game,
    getAnalysis: async () => ({ run }),
    getStoredReview: async () => ({
      analysisRunId: savedReviewInput.analysisRunId,
      inputHash: savedReviewInput.inputHash,
      schemaVersion: savedReviewInput.schemaVersion,
      promptVersion: savedReviewInput.promptVersion,
      model: savedReviewInput.model,
      content: generatedResponse,
    }),
  });
  assert.deepEqual(await service.getStored(1, 7), { review: generatedResponse });
}

{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => ({ ...game, userColor: 'BLACK' }),
    getAnalysis: async () => ({ run }),
    getStoredReview: async () => ({
      analysisRunId: savedReviewInput.analysisRunId,
      inputHash: savedReviewInput.inputHash,
      schemaVersion: savedReviewInput.schemaVersion,
      promptVersion: savedReviewInput.promptVersion,
      model: savedReviewInput.model,
      content: generatedResponse,
    }),
  });
  assert.deepEqual(
    await service.getStored(1, 7),
    { review: null },
    'changing the applicable side-specific knowledge invalidates the saved review',
  );
}

{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => game,
    getAnalysis: async () => ({ run }),
    getStoredReview: async () => null,
    saveStoredReview: async () => {},
    createClient: () => ({
      generateJson: async () => ({
        value: generatedValue({
          openingPlanReferences: [{ planId: 'invented-plan', plyNumber: 3, claim: 'ALIGNED' }],
        }),
      }),
    }),
  });
  await assert.rejects(
    () => service.generate(1, 7),
    (error) => error.code === 'AI_INVALID_RESPONSE',
  );
}

{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => game,
    getAnalysis: async () => ({ run }),
    getStoredReview: async () => null,
    saveStoredReview: async () => {},
    createClient: () => ({
      generateJson: async () => ({
        value: generatedValue({
          openingPlanReferences: [{
            planId: 'french-white-use-space-and-pawn-chain',
            plyNumber: 1,
            claim: 'MISSED_OPPORTUNITY',
          }],
        }),
      }),
    }),
  });
  await assert.rejects(
    () => service.generate(1, 7),
    (error) => error.code === 'AI_INVALID_RESPONSE',
  );
}

{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => game,
    getAnalysis: async () => ({ run }),
    getStoredReview: async () => null,
  });
  assert.deepEqual(await service.getStored(1, 7), { review: null });
}

function generatedValue(overrides = {}) {
  return {
    headline: 'Grounded review',
    overview: 'Overview',
    openingAssessment: 'Opening assessment',
    openingPlanReferences: [],
    turningPoints: [],
    strengths: [],
    improvements: [],
    practicePriorities: [],
    themes: [],
    ...overrides,
  };
}

function move(plyNumber, side, playedMoveUci, classification, scoreLossCp, bestMoveUci) {
  return {
    plyNumber,
    moveNumber: Math.ceil(plyNumber / 2),
    side,
    playedMoveUci,
    playedMoveSan: null,
    classification,
    scoreLossCp,
    bestMoveUci,
    bestScoreCpWhite: 20,
    playedScoreCpWhite: 10,
    bestMateWhite: null,
  };
}

console.log('AI game review tests passed.');
