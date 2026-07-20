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
  opening: { eco: 'C50', name: 'Italian Game' },
  tagCodes: [1],
  tags: [{ code: 1, name: 'Tactical game' }],
  plyIndex: { status: 'INDEXED', indexedAt: null, error: null },
  analysis: {
    status: 'COMPLETED', runId: 1, depth: null, completedAt: null, createdAt: null,
    whiteAccuracy: 88, blackAccuracy: 79, userAccuracy: 88, summary: null, criticalMoveCount: 1,
  },
  pgn: '[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0',
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
    move(2, 'BLACK', 'e7e5', 'GOOD', 8, 'e7e5'),
    move(3, 'WHITE', 'g1f3', 'MISTAKE', 95, 'f1c4'),
    move(4, 'BLACK', 'b8c6', 'BEST', 0, 'b8c6'),
  ],
};

{
  const built = buildGameReviewContext(game, run);
  assert.equal(built.authoritativeMoves.get(3).playedMoveSan, 'Nf3');
  assert.equal(built.authoritativeMoves.get(3).bestMoveSan, 'Bc4');
  assert.equal(built.context.moves[0].before, undefined, 'FEN is not included in provider context');
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
      generateJson: async () => ({
        value: {
          headline: 'A stable win with one avoidable mistake',
          overview: 'You converted the game after a generally controlled opening.',
          openingAssessment: 'The Italian Game position was handled sensibly.',
          turningPoints: [{ plyNumber: 3, explanation: 'This move lost time compared with the engine choice.' }],
          strengths: ['Kept the position under control'],
          improvements: ['Compare candidate developing moves'],
          practicePriorities: ['Opening move-order review'],
          themes: ['development'],
        },
        usage: { promptTokens: 1, completionTokens: 1 },
      }),
    }),
    now: () => new Date('2026-07-19T14:00:00.000Z'),
  });

  generatedResponse = await service.generate(1, 7);
  assert.equal(generatedResponse.review.turningPoints[0].classification, 'MISTAKE');
  assert.equal(generatedResponse.review.turningPoints[0].scoreLossCp, 95);
  assert.equal(generatedResponse.review.turningPoints[0].bestMoveSan, 'Bc4');
  assert.equal(generatedResponse.generatedAt, '2026-07-19T14:00:00.000Z');
  assert.equal(savedReviewInput.analysisRunId, 19);
  assert.equal(savedReviewInput.content, generatedResponse);
  assert.equal(savedReviewInput.inputHash.length, 64);
  assert.equal(savedReviewInput.schemaVersion, 1);
  assert.equal(savedReviewInput.promptVersion, 1);
}

{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => game,
    getStoredReview: async () => ({ content: generatedResponse }),
  });
  assert.deepEqual(await service.getStored(1, 7), { review: generatedResponse });
}

{
  const service = createGameReviewService({
    loadConfig: () => config,
    getGame: async () => game,
    getStoredReview: async () => null,
  });
  assert.deepEqual(await service.getStored(1, 7), { review: null });
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
