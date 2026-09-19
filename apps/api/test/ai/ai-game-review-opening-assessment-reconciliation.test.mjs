import assert from 'node:assert/strict';
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
  tagCodes: [],
  tags: [],
  plyIndex: { status: 'INDEXED', indexedAt: null, error: null },
  analysis: {
    status: 'COMPLETED', runId: 19, depth: null, completedAt: null, createdAt: null,
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
  summary: null,
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
  const plan = built.context.openingKnowledge.plans[0];
  assert.ok(plan, 'fixture must resolve reviewed French knowledge');

  const response = await serviceFor({
    game,
    run,
    generated: generatedValue({
      openingAssessment: 'Invented opening theory that must never reach the saved review.',
      openingPlanReferences: [{
        planId: plan.id,
        plyNumber: 3,
        claim: 'MISSED_OPPORTUNITY',
      }],
    }),
  }).generate(1, game.id);

  assert.ok(!response.review.openingAssessment.includes('Invented opening theory'));
  assert.ok(response.review.openingAssessment.includes(plan.title));
  assert.ok(response.review.openingAssessment.includes(plan.summary));
  assert.ok(response.review.openingAssessment.includes('2. d4'));
}

{
  const built = buildGameReviewContext(game, run);
  const plan = built.context.openingKnowledge.plans[0];
  const service = serviceFor({
    game,
    run,
    generated: generatedValue({
      openingPlanReferences: [
        { planId: plan.id, plyNumber: 3, claim: 'ALIGNED' },
        { planId: plan.id, plyNumber: 3, claim: 'MISSED_OPPORTUNITY' },
      ],
    }),
  });

  await assert.rejects(
    () => service.generate(1, game.id),
    (error) => error.code === 'AI_INVALID_RESPONSE',
    'the same plan and move cannot be both aligned and missed',
  );
}

{
  const unavailableGame = {
    ...game,
    opening: { eco: 'A00', name: 'Invented Opening: Quiet Example' },
    pgn: '[Result "1/2-1/2"]\n\n1/2-1/2',
  };
  const response = await serviceFor({
    game: unavailableGame,
    run: { ...run, moves: [] },
    generated: generatedValue({
      openingAssessment: 'A fabricated strategic plan despite unavailable reviewed knowledge.',
      openingPlanReferences: [],
    }),
  }).generate(1, unavailableGame.id);

  assert.equal(
    response.review.openingAssessment,
    'No reviewed strategic opening guidance was available for Invented Opening: Quiet Example.',
  );
}

function serviceFor({ game: selectedGame, run: selectedRun, generated }) {
  return createGameReviewService({
    loadConfig: () => config,
    getGame: async () => selectedGame,
    getAnalysis: async () => ({ run: selectedRun }),
    getStoredReview: async () => null,
    saveStoredReview: async () => {},
    createClient: () => ({
      generateJson: async () => ({ value: generated }),
    }),
    now: () => new Date('2026-07-19T14:00:00.000Z'),
  });
}

function generatedValue(overrides = {}) {
  return {
    headline: 'Grounded review',
    overview: 'Overview',
    openingAssessment: 'Provider opening assessment',
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

console.log('AI game review opening assessment reconciliation tests passed.');
