import { describe, expect, it } from 'vitest';
import { rankCandidateEvidence, type CandidateRankingInput } from './candidate-ranking';

function candidate(): CandidateRankingInput {
  return {
    moveUci: 'b2b3',
    manuallyRequested: false,
    engine: {
      status: 'AVAILABLE',
      depth: 18,
      mateForTarget: null,
      objectiveDeltaCp: 20,
    },
    population: {
      status: 'AVAILABLE',
      games: 80,
      frequencyPercent: 5,
      scorePercentForTarget: 60,
      positionBaselineScorePercentForTarget: 50,
    },
    masters: {
      status: 'AVAILABLE',
      games: 20,
      frequencyPercent: 2,
      scorePercentForTarget: 50,
      positionBaselineScorePercentForTarget: 50,
    },
    personal: {
      status: 'INSUFFICIENT',
      occurrences: 0,
      games: 0,
      scorePercent: null,
    },
    targetFit: 'NEUTRAL',
    targetReasonCodes: [],
    targetWarningCodes: [],
    profileFit: 'NEUTRAL',
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
};

describe('persona-aligned public ranking components', () => {
  it('makes Surprise components reflect rarity rather than generic corpus support', () => {
    const surprise = rankCandidateEvidence([candidate()], {
      ...context,
      persona: 'SURPRISE',
    })[0];
    const balanced = rankCandidateEvidence([candidate()], {
      ...context,
      persona: 'BALANCED',
    })[0];

    expect(surprise.components.population).toBeGreaterThan(0);
    expect(surprise.components.masters).toBeGreaterThan(80);
    expect(surprise.components.masters).toBeGreaterThan(balanced.components.masters);
    expect(surprise.reasonCodes).not.toContain('POPULATION_COMMON');
    expect(surprise.reasonCodes).not.toContain('MASTER_SUPPORTED');
    expect(surprise.reasonCodes).toContain('POPULATION_STRONG_SCORE');
  });

  it('does not count an upstream available tiny sample as authoritative evidence', () => {
    const sparse = candidate();
    sparse.population = {
      status: 'AVAILABLE',
      games: 1,
      frequencyPercent: 1,
      scorePercentForTarget: 100,
      positionBaselineScorePercentForTarget: 50,
    };
    sparse.masters = {
      status: 'INSUFFICIENT',
      games: 0,
      frequencyPercent: 0,
      scorePercentForTarget: null,
      positionBaselineScorePercentForTarget: 50,
    };

    const ranked = rankCandidateEvidence([sparse], {
      ...context,
      persona: 'SURPRISE',
    })[0];

    expect(ranked.components.population).toBe(0);
    expect(ranked.components.masters).toBe(0);
    expect(ranked.reasonCodes).toContain('LOW_EVIDENCE');
  });
});
