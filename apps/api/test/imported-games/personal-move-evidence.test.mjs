import assert from 'node:assert/strict';
import {
  PERSONAL_MOVE_EVIDENCE_POLICY_VERSION,
  classifyPersonalMoveEvidence,
} from '../../dist/modules/imported-games/personal-move-evidence.js';

assert.equal(PERSONAL_MOVE_EVIDENCE_POLICY_VERSION, '2026-08-personal-move-v1');

assert.deepEqual(classifyPersonalMoveEvidence({
  games: 0,
  resultGames: 0,
  gameSharePercent: 0,
  scoreDeltaVsPositionPercent: null,
}), {
  policyVersion: PERSONAL_MOVE_EVIDENCE_POLICY_VERSION,
  familiarity: 'NEW',
  resultContext: 'INSUFFICIENT',
  resultSampleQualified: false,
});

assert.equal(classifyPersonalMoveEvidence({
  games: 12,
  resultGames: 12,
  gameSharePercent: 35,
  scoreDeltaVsPositionPercent: 2,
}).familiarity, 'COMMON');

assert.equal(classifyPersonalMoveEvidence({
  games: 4,
  resultGames: 4,
  gameSharePercent: 80,
  scoreDeltaVsPositionPercent: 30,
}).familiarity, 'RARE', 'A sparse high percentage must not be called common.');

assert.equal(classifyPersonalMoveEvidence({
  games: 8,
  resultGames: 8,
  gameSharePercent: 10,
  scoreDeltaVsPositionPercent: -20,
}).familiarity, 'RARE');

assert.deepEqual(classifyPersonalMoveEvidence({
  games: 12,
  resultGames: 12,
  gameSharePercent: 30,
  scoreDeltaVsPositionPercent: 7.5,
}), {
  policyVersion: PERSONAL_MOVE_EVIDENCE_POLICY_VERSION,
  familiarity: 'COMMON',
  resultContext: 'ABOVE_BASELINE',
  resultSampleQualified: true,
});

assert.deepEqual(classifyPersonalMoveEvidence({
  games: 15,
  resultGames: 15,
  gameSharePercent: 18,
  scoreDeltaVsPositionPercent: -6,
}), {
  policyVersion: PERSONAL_MOVE_EVIDENCE_POLICY_VERSION,
  familiarity: 'RARE',
  resultContext: 'BELOW_BASELINE',
  resultSampleQualified: true,
});

assert.equal(classifyPersonalMoveEvidence({
  games: 10,
  resultGames: 10,
  gameSharePercent: 25,
  scoreDeltaVsPositionPercent: -4.9,
}).resultContext, 'NEUTRAL');

assert.equal(classifyPersonalMoveEvidence({
  games: 9,
  resultGames: 9,
  gameSharePercent: 40,
  scoreDeltaVsPositionPercent: -30,
}).resultContext, 'INSUFFICIENT', 'Sparse results must remain qualified rather than labelled good or bad.');

const unknownResultHeavy = classifyPersonalMoveEvidence({
  games: 12,
  resultGames: 2,
  gameSharePercent: 40,
  scoreDeltaVsPositionPercent: 20,
});
assert.equal(unknownResultHeavy.familiarity, 'COMMON', 'All indexed games should count for familiarity.');
assert.equal(unknownResultHeavy.resultContext, 'INSUFFICIENT', 'Only games with known results qualify result labels.');
assert.equal(unknownResultHeavy.resultSampleQualified, false);

assert.equal(classifyPersonalMoveEvidence({
  games: 20,
  resultGames: 20,
  gameSharePercent: 40,
  scoreDeltaVsPositionPercent: null,
}).resultContext, 'INSUFFICIENT');

console.log('Personal move evidence classification tests passed.');
