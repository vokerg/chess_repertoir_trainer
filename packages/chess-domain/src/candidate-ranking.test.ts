import { describe, expect, it } from 'vitest';
import {
  CandidateRankingInput,
  CandidateRankingPersona,
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

function benchmarkCandidate(
  moveUci: string,
  input: {
    objectiveDeltaCp: number;
    populationGames: number;
    populationFrequency: number;
    populationScore: number;
    populationBaseline: number;
    mastersGames: number;
    mastersFrequency: number;
    mastersScore: number;
    mastersBaseline: number;
  },
): CandidateRankingInput {
  return candidate(moveUci, {
    engine: {
      status: 'AVAILABLE',
      depth: 20,
      mateForTarget: null,
      objectiveDeltaCp: input.objectiveDeltaCp,
    },
    population: {
      status: 'AVAILABLE',
      games: input.populationGames,
      frequencyPercent: input.populationFrequency,
      scorePercentForTarget: input.populationScore,
      positionBaselineScorePercentForTarget: input.populationBaseline,
    },
    masters: {
      status: 'AVAILABLE',
      games: input.mastersGames,
      frequencyPercent: input.mastersFrequency,
      scorePercentForTarget: input.mastersScore,
      positionBaselineScorePercentForTarget: input.mastersBaseline,
    },
  });
}

function rankForPersona(
  inputs: readonly CandidateRankingInput[],
  persona: CandidateRankingPersona,
): string[] {
  return rankCandidateEvidence(inputs, { ...baseContext, persona })
    .map((entry) => entry.input.moveUci);
}

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

  it('calibrates four empirical personas against the same benchmark position', () => {
    const established = benchmarkCandidate('a2a3', {
      objectiveDeltaCp: 0,
      populationGames: 300,
      populationFrequency: 25,
      populationScore: 51,
      populationBaseline: 50,
      mastersGames: 500,
      mastersFrequency: 60,
      mastersScore: 51,
      mastersBaseline: 50,
    });
    const peerPractical = benchmarkCandidate('b2b3', {
      objectiveDeltaCp: 25,
      populationGames: 400,
      populationFrequency: 40,
      populationScore: 56,
      populationBaseline: 50,
      mastersGames: 250,
      mastersFrequency: 25,
      mastersScore: 53,
      mastersBaseline: 50,
    });
    const activeOverperformer = benchmarkCandidate('c2c4', {
      objectiveDeltaCp: 70,
      populationGames: 180,
      populationFrequency: 18,
      populationScore: 59,
      populationBaseline: 50,
      mastersGames: 180,
      mastersFrequency: 20,
      mastersScore: 54,
      mastersBaseline: 50,
    });
    const uncommonOverperformer = benchmarkCandidate('d2d3', {
      objectiveDeltaCp: 30,
      populationGames: 50,
      populationFrequency: 5,
      populationScore: 62,
      populationBaseline: 50,
      mastersGames: 25,
      mastersFrequency: 2,
      mastersScore: 50,
      mastersBaseline: 50,
    });
    const benchmark = [established, peerPractical, activeOverperformer, uncommonOverperformer];

    expect(rankForPersona(benchmark, 'BALANCED')[0]).toBe('b2b3');
    expect(rankForPersona(benchmark, 'SOLID')[0]).toBe('a2a3');
    expect(rankForPersona(benchmark, 'AGGRESSIVE')[0]).toBe('c2c4');
    expect(rankForPersona(benchmark, 'SURPRISE')[0]).toBe('d2d3');
  });

  it('scores empirical performance against the position baseline rather than fixed 50 percent', () => {
    const baselineWinner = benchmarkCandidate('a2a3', {
      objectiveDeltaCp: 20,
      populationGames: 200,
      populationFrequency: 20,
      populationScore: 47,
      populationBaseline: 42,
      mastersGames: 50,
      mastersFrequency: 5,
      mastersScore: 45,
      mastersBaseline: 44,
    });
    const nominalWinner = benchmarkCandidate('b2b3', {
      objectiveDeltaCp: 20,
      populationGames: 200,
      populationFrequency: 20,
      populationScore: 52,
      populationBaseline: 55,
      mastersGames: 50,
      mastersFrequency: 5,
      mastersScore: 45,
      mastersBaseline: 44,
    });

    const ranked = rankCandidateEvidence([nominalWinner, baselineWinner], {
      ...baseContext,
      persona: 'AGGRESSIVE',
    });

    expect(ranked[0].input.moveUci).toBe('a2a3');
    expect(ranked[0].reasonCodes).toContain('POPULATION_STRONG_SCORE');
    expect(ranked[1].reasonCodes).not.toContain('POPULATION_STRONG_SCORE');
  });

  it('does not let a tiny rare sample dominate Surprise ranking', () => {
    const supported = benchmarkCandidate('a2a3', {
      objectiveDeltaCp: 40,
      populationGames: 40,
      populationFrequency: 6,
      populationScore: 60,
      populationBaseline: 50,
      mastersGames: 20,
      mastersFrequency: 2,
      mastersScore: 50,
      mastersBaseline: 50,
    });
    const tiny = candidate('b2b3', {
      engine: {
        status: 'AVAILABLE',
        depth: 20,
        mateForTarget: null,
        objectiveDeltaCp: 0,
      },
      population: {
        status: 'INSUFFICIENT',
        games: 2,
        frequencyPercent: 0.5,
        scorePercentForTarget: 100,
        positionBaselineScorePercentForTarget: 50,
      },
      masters: {
        status: 'INSUFFICIENT',
        games: 0,
        frequencyPercent: 0,
        scorePercentForTarget: null,
        positionBaselineScorePercentForTarget: 50,
      },
    });

    expect(rankForPersona([tiny, supported], 'SURPRISE')[0]).toBe('a2a3');
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
