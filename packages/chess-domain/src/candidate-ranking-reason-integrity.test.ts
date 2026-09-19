import { describe, expect, it } from 'vitest';
import { rankCandidateEvidence, type CandidateRankingInput } from './candidate-ranking';

function candidate(moveUci: string, masters: CandidateRankingInput['masters']): CandidateRankingInput {
  return {
    moveUci,
    manuallyRequested: false,
    engine: {
      status: 'AVAILABLE',
      depth: 18,
      mateForTarget: null,
      objectiveDeltaCp: 20,
    },
    population: {
      status: 'AVAILABLE',
      games: 200,
      frequencyPercent: 20,
      scorePercentForTarget: 52,
      positionBaselineScorePercentForTarget: 50,
    },
    masters,
    personal: {
      status: 'INSUFFICIENT',
      occurrences: 0,
      games: 0,
      scorePercent: null,
    },
    targetFit: 'NEUTRAL',
    targetReasonCodes: [],
    targetWarningCodes: [],
    profileFit: 'UNKNOWN',
    profileReasonCodes: [],
    course: {
      status: 'INSUFFICIENT',
      covered: false,
      conflict: false,
      transposesToCoveredPosition: false,
    },
  };
}

const context = {
  role: 'USER_MOVE' as const,
  speedPreset: 'BLITZ_AND_SLOWER' as const,
  riskTolerance: 'MEDIUM' as const,
  allowDeliberatelyDubious: false,
  persona: 'SOLID' as const,
};

describe('candidate ranking reason integrity', () => {
  it('does not claim master support when the empirical Masters signal is negative', () => {
    const negative = rankCandidateEvidence([
      candidate('a2a3', {
        status: 'AVAILABLE',
        games: 100,
        frequencyPercent: 1,
        scorePercentForTarget: 30,
        positionBaselineScorePercentForTarget: 50,
      }),
    ], context)[0];

    expect(negative.components.masters).toBeLessThan(0);
    expect(negative.reasonCodes).not.toContain('MASTER_SUPPORTED');
  });

  it('emits master support when the empirical Masters signal is positive', () => {
    const positive = rankCandidateEvidence([
      candidate('b2b3', {
        status: 'AVAILABLE',
        games: 100,
        frequencyPercent: 20,
        scorePercentForTarget: 52,
        positionBaselineScorePercentForTarget: 50,
      }),
    ], context)[0];

    expect(positive.components.masters).toBeGreaterThan(0);
    expect(positive.reasonCodes).toContain('MASTER_SUPPORTED');
  });
});
