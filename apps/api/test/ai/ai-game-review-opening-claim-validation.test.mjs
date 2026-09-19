import assert from 'node:assert/strict';
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
    whiteAccuracy: 88, blackAccuracy: 79, userAccuracy: 88, summary: null, criticalMoveCount: 0,
  },
  pgn: '[Result "1-0"]\n\n1. e4 e6 2. d4 d5 1-0',
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
    move(1, 'WHITE', 'e2e4'),
    move(2, 'BLACK', 'e7e6'),
    move(3, 'WHITE', 'd2d4'),
    move(4, 'BLACK', 'd7d5'),
  ],
};

const service = createGameReviewService({
  loadConfig: () => config,
  getGame: async () => game,
  getAnalysis: async () => ({ run }),
  saveStoredReview: async () => {
    throw new Error('Invalid generated review must not be stored.');
  },
  createClient: () => ({
    generateJson: async () => ({
      value: {
        headline: 'Grounded review',
        overview: 'Overview',
        openingAssessment: 'The supplied White plan was followed on Black’s move.',
        openingPlanReferences: [{
          planId: 'french-white-use-space-and-pawn-chain',
          plyNumber: 2,
          claim: 'ALIGNED',
        }],
        turningPoints: [],
        strengths: [],
        improvements: [],
        practicePriorities: [],
        themes: [],
      },
    }),
  }),
});

await assert.rejects(
  () => service.generate(1, 7),
  (error) => error.code === 'AI_INVALID_RESPONSE',
);

console.log('AI game review opening claim validation tests passed.');

function move(plyNumber, side, playedMoveUci) {
  return {
    plyNumber,
    moveNumber: Math.ceil(plyNumber / 2),
    side,
    playedMoveUci,
    playedMoveSan: null,
    classification: 'BEST',
    scoreLossCp: 0,
    bestMoveUci: playedMoveUci,
    bestScoreCpWhite: 0,
    playedScoreCpWhite: 0,
    bestMateWhite: null,
  };
}
