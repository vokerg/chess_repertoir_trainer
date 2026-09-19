import assert from 'node:assert/strict';
import {
  aiBuilderCandidateExplanationResponseSchema,
  aiBuilderCompletionSummaryResponseSchema,
  aiCapabilitiesResponseSchema,
  aiGameReviewResponseSchema,
  aiGameReviewStateResponseSchema,
} from '../dist/ai/index.js';
import { CANDIDATE_RANKING_POLICY_VERSION } from '../dist/candidate-decision/index.js';

assert.deepEqual(aiCapabilitiesResponseSchema.parse({
  widgets: {
    gameReview: true,
    builderCandidateExplanation: false,
    builderCompletionSummary: true,
  },
}), {
  widgets: {
    gameReview: true,
    builderCandidateExplanation: false,
    builderCompletionSummary: true,
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
    rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
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

const completionSummary = {
  kind: 'BUILDER_COMPLETION_SUMMARY',
  schemaVersion: 1,
  generatedAt: '2026-07-30T19:00:00.000Z',
  identity: {
    sessionId: 'session-rb020',
    sessionRevision: 9,
    targetId: 'target-rb020',
    courseId: 11,
    chapterId: 22,
    lineId: 33,
    courseContentRevision: 8,
  },
  authoritativeResult: {
    courseId: 11,
    courseName: 'White repertoire',
    chapterId: 22,
    chapterName: 'Open games',
    lineId: 33,
    lineName: 'Reviewed line',
    targetKind: 'NEW_LINE',
    createdMoves: 2,
    reusedMoves: 0,
    skippedBranches: 1,
    totalDraftMoves: 2,
    courseContentRevision: 8,
    idempotent: false,
    factualSummary: 'Reviewed line in White repertoire · Open games was updated with 2 created moves.',
  },
  interpretation: {
    interpretation: 'The verified result contains one applied path and one excluded branch.',
    interpretationReferenceIds: ['path.1', 'result.skipped_branches'],
    highlights: [{
      text: 'The applied path contains e2e4 e7e5.',
      evidenceReferenceIds: ['path.1'],
    }],
    studyChecklist: [{
      text: 'Review the supplied applied path.',
      evidenceReferenceIds: ['path.1'],
    }],
    unresolvedWorkNote: {
      text: 'One deferred branch remains excluded.',
      evidenceReferenceIds: ['excluded.1'],
    },
    warning: null,
  },
  referencedFacts: [
    { id: 'path.1', label: 'Applied path 1', value: 'e2e4 e7e5' },
    { id: 'result.skipped_branches', label: 'Excluded branches', value: '1' },
    { id: 'excluded.1', label: 'Excluded branch 1', value: 'branch-deferred · d2d4 · Deferred' },
  ],
  disclaimer: 'Course changes are authoritative; generated study suggestions are optional.',
};

assert.deepEqual(aiBuilderCompletionSummaryResponseSchema.parse(completionSummary), completionSummary);
assert.equal(
  aiBuilderCompletionSummaryResponseSchema.safeParse({
    ...completionSummary,
    referencedFacts: [{ id: 'candidate.rank', label: 'Unsupported', value: '#1' }],
  }).success,
  false,
  'completion fact identifiers are limited to result, draft, path, or excluded namespaces',
);
assert.equal(
  aiBuilderCompletionSummaryResponseSchema.safeParse({
    ...completionSummary,
    interpretation: {
      ...completionSummary.interpretation,
      studyChecklist: Array(4).fill(completionSummary.interpretation.studyChecklist[0]),
    },
  }).success,
  false,
  'generated study checklist remains bounded',
);
assert.equal(
  aiBuilderCompletionSummaryResponseSchema.safeParse({
    ...completionSummary,
    disclaimer: 'The model changed the course.',
  }).success,
  false,
  'completion summary non-authority disclaimer is fixed',
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