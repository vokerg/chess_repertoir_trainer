import { describe, expect, it } from 'vitest';
import { rankCandidateEvidence, type CandidateRankingInput } from './candidate-ranking';

function candidate(
  moveUci: string,
  overrides: Partial<CandidateRankingInput> = {},
): CandidateRankingInput {
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
      games: 300,
      frequencyPercent: 30,
      scorePercentForTarget: 56,
      positionBaselineScorePercentForTarget: 50,
    },
    masters: {
      status: 'AVAILABLE',
      games: 100,
      frequencyPercent: 20,
      scorePercentForTarget: 52,
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
    ...overrides,
  };
}

const context = {
  role: 'USER_MOVE' as const,
  speedPreset: 'BLITZ_AND_SLOWER' as const,
  riskTolerance: 'MEDIUM' as const,
  allowDeliberatelyDubious: false,
};

describe('empirical user-move authority isolation', () => {
  it('keeps legacy context inspectable without letting it demote a preset persona candidate', () => {
    const empiricalWinner = candidate('a2a3', {
      population: {
        status: 'AVAILABLE',
        games: 400,
        frequencyPercent: 45,
        scorePercentForTarget: 60,
        positionBaselineScorePercentForTarget: 50,
      },
      targetFit: 'CONFLICT',
      targetReasonCodes: ['TARGET_THEORY_EXCEEDED'],
      targetWarningCodes: ['THEORY_BUDGET_EXCEEDED'],
      profileFit: 'ALIGNED',
      profileReasonCodes: ['PROFILE_PREFERENCE_MATCH'],
      personal: {
        status: 'AVAILABLE',
        occurrences: 20,
        games: 20,
        scorePercent: 60,
      },
      course: {
        status: 'AVAILABLE',
        covered: true,
        conflict: false,
        transposesToCoveredPosition: false,
      },
    });
    const weaker = candidate('b2b3', {
      engine: {
        status: 'AVAILABLE',
        depth: 18,
        mateForTarget: null,
        objectiveDeltaCp: 60,
      },
      population: {
        status: 'AVAILABLE',
        games: 200,
        frequencyPercent: 15,
        scorePercentForTarget: 51,
        positionBaselineScorePercentForTarget: 50,
      },
      masters: {
        status: 'AVAILABLE',
        games: 30,
        frequencyPercent: 5,
        scorePercentForTarget: 50,
        positionBaselineScorePercentForTarget: 50,
      },
    });

    const ranked = rankCandidateEvidence([weaker, empiricalWinner], {
      ...context,
      persona: 'BALANCED',
    });
    const winner = ranked[0];

    expect(winner.input.moveUci).toBe('a2a3');
    expect(winner.eligibility).toBe('ELIGIBLE');
    expect(winner.components.personal).toBe(0);
    expect(winner.components.targetFit).toBe(0);
    expect(winner.components.profileFit).toBe(0);
    expect(winner.components.course).toBe(0);
    expect(winner.reasonCodes).not.toContain('TARGET_THEORY_EXCEEDED');
    expect(winner.reasonCodes).not.toContain('PROFILE_PREFERENCE_MATCH');
    expect(winner.reasonCodes).not.toContain('PERSONALLY_FAMILIAR');
    expect(winner.reasonCodes).not.toContain('COURSE_ALREADY_COVERS');
    expect(winner.warningCodes).toContain('THEORY_BUDGET_EXCEEDED');
  });

  it('preserves legacy target-fit authority for CUSTOM', () => {
    const legacy = candidate('a2a3', {
      targetFit: 'CONFLICT',
      targetReasonCodes: ['TARGET_THEORY_EXCEEDED'],
      targetWarningCodes: ['THEORY_BUDGET_EXCEEDED'],
    });

    const ranked = rankCandidateEvidence([legacy], {
      ...context,
      persona: 'CUSTOM',
    })[0];

    expect(ranked.eligibility).toBe('WARNING');
    expect(ranked.components.targetFit).toBe(-50);
    expect(ranked.reasonCodes).toContain('TARGET_THEORY_EXCEEDED');
  });
});
