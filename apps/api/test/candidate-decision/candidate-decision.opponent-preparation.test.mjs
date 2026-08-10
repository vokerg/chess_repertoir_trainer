import assert from 'node:assert/strict';
import {
  applyOpponentPreparationPolicy,
} from '../../dist/modules/candidate-decision/candidate-decision-opponent-preparation.service.js';

function candidate(moveUci, options = {}) {
  const {
    populationFrequency = 1,
    populationGames = 100,
    personalGames = 0,
    personalOccurrences = personalGames,
    objectiveDeltaCp = 0,
    courseConflict = false,
  } = options;

  return {
    rank: 99,
    moveUci,
    moveSan: moveUci,
    resultingFen: 'test-fen',
    previewUci: [moveUci],
    manuallyRequested: false,
    eligibility: {
      status: 'ELIGIBLE',
      reasonCodes: ['TARGET_CHARACTER_MATCH', 'PROFILE_PREFERENCE_MATCH'],
      warningCodes: ['TARGET_SOUNDNESS_MISMATCH', ...(courseConflict ? ['COURSE_CONFLICT'] : [])],
    },
    targetFit: { status: 'ALIGNED', reasonCodes: ['TARGET_CHARACTER_MATCH'] },
    profileFit: { status: 'CONFLICT', reasonCodes: ['PROFILE_PREFERENCE_MATCH'] },
    components: {
      objective: 0,
      population: 0,
      masters: 0,
      personal: 0,
      targetFit: 40,
      profileFit: -25,
      course: 0,
    },
    reasonCodes: ['TARGET_CHARACTER_MATCH', 'PROFILE_PREFERENCE_MATCH'],
    warningCodes: ['TARGET_SOUNDNESS_MISMATCH', ...(courseConflict ? ['COURSE_CONFLICT'] : [])],
    coverage: { contributionPercent: populationFrequency, cumulativePercent: populationFrequency },
    evidence: {
      engine: {
        status: 'AVAILABLE',
        depth: 18,
        mateForTarget: null,
        objectiveDeltaCp,
      },
      population: {
        status: 'AVAILABLE',
        games: populationGames,
        frequencyPercent: populationFrequency,
        scorePercentForTarget: 50,
        positionBaselineScorePercentForTarget: 50,
      },
      masters: {
        status: 'AVAILABLE',
        games: 20,
        frequencyPercent: 5,
        scorePercentForTarget: 50,
        positionBaselineScorePercentForTarget: 50,
      },
      personal: {
        status: personalGames > 0 ? 'AVAILABLE' : 'INSUFFICIENT',
        occurrences: personalOccurrences,
        games: personalGames,
        gameCount: personalGames,
        scorePercent: null,
      },
      course: {
        status: courseConflict ? 'AVAILABLE' : 'INSUFFICIENT',
        covered: false,
        conflict: courseConflict,
        transposesToCoveredPosition: false,
      },
    },
  };
}

{
  const userMoveResponse = {
    decisionRole: 'USER_MOVE',
    candidates: [candidate('a2a3')],
  };
  assert.equal(applyOpponentPreparationPolicy(userMoveResponse), userMoveResponse);
}

{
  const response = applyOpponentPreparationPolicy({
    decisionRole: 'OPPONENT_RESPONSE',
    candidates: [
      candidate('a7a6', { populationFrequency: 40 }),
      candidate('b7b6', { populationFrequency: 1, objectiveDeltaCp: 150 }),
      candidate('c7c6', { populationFrequency: 1, personalGames: 4 }),
      candidate('d7d6', { populationFrequency: 1, courseConflict: true }),
    ],
  });

  assert.deepEqual(
    response.candidates.map((entry) => entry.moveUci),
    ['a7a6', 'b7b6', 'c7c6', 'd7d6'],
  );
  assert.deepEqual(
    response.candidates.map((entry) => entry.rank),
    [1, 2, 3, 4],
  );

  const common = response.candidates[0];
  assert.deepEqual(common.reasonCodes, ['COMMON_AT_TARGET_LEVEL']);
  assert.equal(common.coverage.contributionPercent, 40);
  assert.equal(common.coverage.cumulativePercent, null);

  const dangerous = response.candidates[1];
  assert.deepEqual(dangerous.reasonCodes, ['DANGEROUS_RESPONSE']);

  const personal = response.candidates[2];
  assert.deepEqual(personal.reasonCodes, ['PERSONALLY_ENCOUNTERED']);

  const optionalCourseConflict = response.candidates[3];
  assert.deepEqual(optionalCourseConflict.reasonCodes, ['COURSE_CONFLICT']);
  assert.deepEqual(optionalCourseConflict.warningCodes, ['COURSE_CONFLICT']);

  for (const entry of response.candidates) {
    assert.equal(entry.targetFit.status, 'UNKNOWN');
    assert.deepEqual(entry.targetFit.reasonCodes, []);
    assert.equal(entry.profileFit.status, 'UNKNOWN');
    assert.deepEqual(entry.profileFit.reasonCodes, []);
    assert.equal(entry.components.targetFit, 0);
    assert.equal(entry.components.profileFit, 0);
    assert.equal(entry.reasonCodes.includes('TARGET_CHARACTER_MATCH'), false);
    assert.equal(entry.reasonCodes.includes('PROFILE_PREFERENCE_MATCH'), false);
    assert.equal(entry.warningCodes.includes('TARGET_SOUNDNESS_MISMATCH'), false);
  }
}
