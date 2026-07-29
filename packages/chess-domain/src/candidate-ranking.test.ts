import { describe, expect, it } from 'vitest';
import {
  CandidateRankingInput,
  rankCandidateEvidence,
} from './candidate-ranking';

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
      objectiveDeltaCp: 0,
    },
    population: {
      status: 'AVAILABLE',
      games: 100,
      frequencyPercent: 10,
      scorePercentForTarget: 50,
    },
    masters: {
      status: 'AVAILABLE',
      games: 20,
      frequencyPercent: 5,
      scorePercentForTarget: 50,
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
    profileFit: 'UNKNOWN',
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

const baseContext = {
  role: 'USER_MOVE' as const,
  speedPreset: 'BLITZ_AND_SLOWER' as const,
  riskTolerance: 'MEDIUM' as const,
  allowDeliberatelyDubious: false,
};

describe('candidate ranking', () => {
  it('changes ordering reproducibly for a bullet target', () => {
    const objectiveMove = candidate('a2a3', {
      population: {
        status: 'AVAILABLE',
        games: 100,
        frequencyPercent: 1,
        scorePercentForTarget: 50,
      },
    });
    const practicalMove = candidate('b2b3', {
      engine: {
        status: 'AVAILABLE',
        depth: 18,
        mateForTarget: null,
        objectiveDeltaCp: 80,
      },
      population: {
        status: 'AVAILABLE',
        games: 500,
        frequencyPercent: 80,
        scorePercentForTarget: 50,
      },
    });

    expect(rankCandidateEvidence([objectiveMove, practicalMove], baseContext)[0].input.moveUci)
      .toBe('a2a3');
    expect(rankCandidateEvidence([objectiveMove, practicalMove], {
      ...baseContext,
      speedPreset: 'BULLET',
    })[0].input.moveUci).toBe('b2b3');
  });

  it('keeps a deliberately dubious manual move visible with an explicit warning', () => {
    const risky = candidate('g2g4', {
      manuallyRequested: true,
      engine: {
        status: 'AVAILABLE',
        depth: 18,
        mateForTarget: null,
        objectiveDeltaCp: 400,
      },
      targetFit: 'ALIGNED',
    });

    const ranked = rankCandidateEvidence([risky], {
      ...baseContext,
      riskTolerance: 'HIGH',
      allowDeliberatelyDubious: true,
    })[0];

    expect(ranked.eligibility).toBe('WARNING');
    expect(ranked.reasonCodes).toContain('MANUAL_CANDIDATE');
    expect(ranked.warningCodes).toContain('OBJECTIVE_LOSS');
  });

  it('does not fabricate personal familiarity from sparse data', () => {
    const sparse = candidate('c2c4', {
      personal: {
        status: 'INSUFFICIENT',
        occurrences: 1,
        games: 1,
        scorePercent: 100,
      },
    });

    const ranked = rankCandidateEvidence([sparse], baseContext)[0];
    expect(ranked.components.personal).toBe(0);
    expect(ranked.reasonCodes).not.toContain('PERSONALLY_FAMILIAR');
    expect(ranked.warningCodes).toContain('SPARSE_PERSONAL_EVIDENCE');
  });

  it('uses stable UCI tie-breaking', () => {
    const ranked = rankCandidateEvidence([
      candidate('h2h3'),
      candidate('a2a3'),
    ], baseContext);
    expect(ranked.map((entry) => entry.input.moveUci)).toEqual(['a2a3', 'h2h3']);
  });

  it('prioritizes opponent coverage and exposes cumulative contribution', () => {
    const common = candidate('e7e5', {
      population: {
        status: 'AVAILABLE',
        games: 600,
        frequencyPercent: 60,
        scorePercentForTarget: 48,
      },
      personal: {
        status: 'AVAILABLE',
        occurrences: 8,
        games: 8,
        scorePercent: 45,
      },
    });
    const rare = candidate('c7c5', {
      population: {
        status: 'AVAILABLE',
        games: 200,
        frequencyPercent: 20,
        scorePercentForTarget: 50,
      },
    });

    const ranked = rankCandidateEvidence([rare, common], {
      ...baseContext,
      role: 'OPPONENT_RESPONSE',
    });

    expect(ranked[0].input.moveUci).toBe('e7e5');
    expect(ranked[0].reasonCodes).toContain('COMMON_AT_TARGET_LEVEL');
    expect(ranked[0].coverageContributionPercent).toBe(60);
    expect(ranked[1].cumulativeCoveragePercent).toBe(80);
  });
});
