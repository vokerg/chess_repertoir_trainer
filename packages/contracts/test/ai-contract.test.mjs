import assert from 'node:assert/strict';
import {
  aiBuilderCandidateExplanationResponseSchema,
  aiCapabilitiesResponseSchema,
  aiGameReviewResponseSchema,
  aiGameReviewStateResponseSchema,
} from '../dist/ai/index.js';

assert.deepEqual(aiCapabilitiesResponseSchema.parse({
  widgets: {
    gameReview: true,
    builderCandidateExplanation: false,
  },
}), {
  widgets: {
    gameReview: true,
    builderCandidateExplanation: false,
  },
});

const explanation = {
  kind: 'BUILDER_CANDIDATE_EXPLANATION',
  schemaVersion: 1,
  generatedAt: '2026-07-30T15:00:00.000Z',
  identity: {
    targetId: 'fa8d7aae-f46e-4dce-b2a7-6644b9eca199',
    normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
    decisionRole: 'USER_MOVE',
    rankingPolicyVersion: '2026-07-deterministic-v1',
    responseGeneratedAt: '2026-07-30T14:59:00.000Z',
    selectedMoveUci: 'e2e4',
    comparisonMoveUci: 'd2d4',
  },
  selectedCandidate: { moveUci: 'e2e4', moveSan: 'e4', rank: 1 },
  comparisonCandidate: { moveUci: 'd2d4', moveSan: 'd4', rank: 2 },
  explanation: {
    summary: 'The selected candidate has the higher deterministic rank while both moves retain explicit evidence limits.',
    tradeoffs: [{
      text: 'The selected move is more common in the supplied target-population evidence.',
      evidenceReferenceIds: ['selected.population_frequency', 'comparison.population_frequency'],
    }],
    evidenceReferenceIds: ['selected.rank', 'comparison.rank'],
    missingEvidenceReferenceId: 'source.playerprofile',
  },
  referencedFacts: [
    { id: 'selected.rank', label: 'Selected deterministic rank', value: '#1', missing: false },
    { id: 'comparison.rank', label: 'Comparison deterministic rank', value: '#2', missing: false },
    { id: 'selected.population_frequency', label: 'Selected population frequency', value: '28%', missing: false },
    { id: 'comparison.population_frequency', label: 'Comparison population frequency', value: '19%', missing: false },
    { id: 'source.playerprofile', label: 'Player profile source', value: 'Unavailable', missing: true },
  ],
  disclaimer: 'Candidate ranking remains deterministic and move choice remains yours.',
};

assert.deepEqual(aiBuilderCandidateExplanationResponseSchema.parse(explanation), explanation);
assert.equal(
  aiBuilderCandidateExplanationResponseSchema.safeParse({
    ...explanation,
    referencedFacts: [{ id: 'arbitrary.fact', label: 'Unsupported', value: 'No', missing: false }],
  }).success,
  false,
  'fact identifiers are limited to authoritative selected, comparison, or source namespaces',
);
assert.equal(
  aiBuilderCandidateExplanationResponseSchema.safeParse({
    ...explanation,
    disclaimer: 'The model selected the best move.',
  }).success,
  false,
  'the non-authority disclaimer is fixed',
);

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
