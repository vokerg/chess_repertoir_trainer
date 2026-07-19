import assert from 'node:assert/strict';
import {
  aiCapabilitiesResponseSchema,
  aiGameReviewResponseSchema,
  aiGameReviewStateResponseSchema,
} from '../dist/ai/index.js';

assert.deepEqual(aiCapabilitiesResponseSchema.parse({ widgets: { gameReview: true } }), {
  widgets: { gameReview: true },
});

const review = {
  kind: 'GAME_REVIEW',
  schemaVersion: 1,
  generatedAt: '2026-07-19T14:00:00.000Z',
  review: {
    headline: 'A solid opening was undone by one tactical oversight',
    overview: 'You reached a playable middlegame before losing material.',
    openingAssessment: 'The opening phase was stable and developed naturally.',
    turningPoints: [{
      plyNumber: 21,
      moveNumber: 11,
      side: 'WHITE',
      playedMoveSan: 'Bxh7+',
      bestMoveSan: 'Re1',
      classification: 'Blunder',
      scoreLossCp: 240,
      explanation: 'The sacrifice did not produce enough compensation.',
    }],
    strengths: ['Active development'],
    improvements: ['Check forcing replies before sacrificing'],
    practicePriorities: ['Tactical verification'],
    themes: ['king safety'],
  },
  warnings: [],
};

assert.deepEqual(aiGameReviewResponseSchema.parse(review), review);
assert.deepEqual(aiGameReviewStateResponseSchema.parse({ review }), { review });
assert.deepEqual(aiGameReviewStateResponseSchema.parse({ review: null }), { review: null });
assert.equal(
  aiGameReviewResponseSchema.safeParse({
    ...review,
    review: { ...review.review, turningPoints: Array(7).fill(review.review.turningPoints[0]) },
  }).success,
  false,
  'turning points remain bounded',
);
assert.equal(
  aiGameReviewResponseSchema.safeParse({ ...review, kind: 'ARBITRARY' }).success,
  false,
  'the response kind is explicit',
);

console.log('AI contract tests passed.');
