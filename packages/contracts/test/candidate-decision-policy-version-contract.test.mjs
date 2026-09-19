import assert from 'node:assert/strict';
import {
  CANDIDATE_OPPONENT_PREPARATION_POLICY_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
  candidateRankingPolicyVersionSchema,
} from '../dist/candidate-decision/index.js';

assert.equal(CANDIDATE_RANKING_POLICY_VERSION, '2026-08-empirical-persona-v2');
assert.equal(
  CANDIDATE_OPPONENT_PREPARATION_POLICY_VERSION,
  '2026-08-opponent-preparation-v1',
);
assert.equal(candidateRankingPolicyVersionSchema.parse(CANDIDATE_RANKING_POLICY_VERSION), CANDIDATE_RANKING_POLICY_VERSION);
assert.equal(
  candidateRankingPolicyVersionSchema.parse(CANDIDATE_OPPONENT_PREPARATION_POLICY_VERSION),
  CANDIDATE_OPPONENT_PREPARATION_POLICY_VERSION,
);
assert.equal(candidateRankingPolicyVersionSchema.safeParse('2026-08-unknown-policy').success, false);
