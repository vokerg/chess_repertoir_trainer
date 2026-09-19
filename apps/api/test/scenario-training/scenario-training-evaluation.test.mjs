import assert from 'node:assert/strict';
import { evaluateScenarioAttempt } from '../../dist/modules/scenario-training/scenario-training-evaluation.js';

const session102Like = evaluateScenarioAttempt({
  moveUci: 'b2c1',
  referenceBestMoveUci: 'b2f6',
  originalUserMoveUci: 'b2c1',
  sessionBaselineUserEvalCp: 523,
  submittedBaselineUserEvalCp: 150,
  afterUserEvalCp: 78,
  passToleranceCp: 100,
});

assert.equal(session102Like.baselineUserEvalCp, 523);
assert.equal(session102Like.deltaCp, 445);
assert.equal(session102Like.passed, false);

const referenceMove = evaluateScenarioAttempt({
  moveUci: 'b2f6',
  referenceBestMoveUci: 'b2f6',
  originalUserMoveUci: 'b2c1',
  sessionBaselineUserEvalCp: 523,
  submittedBaselineUserEvalCp: 150,
  afterUserEvalCp: 40,
  passToleranceCp: 100,
});

assert.equal(referenceMove.passed, true);

const alternativeCloseMove = evaluateScenarioAttempt({
  moveUci: 'b2d4',
  referenceBestMoveUci: 'b2f6',
  originalUserMoveUci: 'b2c1',
  sessionBaselineUserEvalCp: 523,
  submittedBaselineUserEvalCp: 150,
  afterUserEvalCp: 450,
  passToleranceCp: 100,
});

assert.equal(alternativeCloseMove.passed, true);

const fallbackBaseline = evaluateScenarioAttempt({
  moveUci: 'b2d4',
  referenceBestMoveUci: 'b2f6',
  originalUserMoveUci: 'b2c1',
  sessionBaselineUserEvalCp: null,
  submittedBaselineUserEvalCp: 150,
  afterUserEvalCp: 78,
  passToleranceCp: 100,
});

assert.equal(fallbackBaseline.baselineUserEvalCp, 150);
assert.equal(fallbackBaseline.passed, true);

const repeatedBlunder = evaluateScenarioAttempt({
  moveUci: 'f2f3',
  referenceBestMoveUci: 'g1f3',
  originalUserMoveUci: 'f2f3',
  sessionBaselineUserEvalCp: 35,
  submittedBaselineUserEvalCp: 30,
  afterUserEvalCp: 20,
  passToleranceCp: 100,
});

assert.equal(repeatedBlunder.passed, false);

const blunderAlternativeWithinTolerance = evaluateScenarioAttempt({
  moveUci: 'd2d3',
  referenceBestMoveUci: 'g1f3',
  originalUserMoveUci: 'f2f3',
  sessionBaselineUserEvalCp: 35,
  submittedBaselineUserEvalCp: 30,
  afterUserEvalCp: -65,
  passToleranceCp: 100,
});

assert.equal(blunderAlternativeWithinTolerance.passed, true);

const blunderBestMove = evaluateScenarioAttempt({
  moveUci: 'g1f3',
  referenceBestMoveUci: 'g1f3',
  originalUserMoveUci: 'f2f3',
  sessionBaselineUserEvalCp: 35,
  submittedBaselineUserEvalCp: 30,
  afterUserEvalCp: -200,
  passToleranceCp: 100,
});

assert.equal(blunderBestMove.passed, true);

const blunderAlternativeBelowTolerance = evaluateScenarioAttempt({
  moveUci: 'g2g4',
  referenceBestMoveUci: 'g1f3',
  originalUserMoveUci: 'f2f3',
  sessionBaselineUserEvalCp: 35,
  submittedBaselineUserEvalCp: 30,
  afterUserEvalCp: -66,
  passToleranceCp: 100,
});

assert.equal(blunderAlternativeBelowTolerance.passed, false);

console.log('Scenario training evaluation tests passed.');
