import { describe, expect, it } from 'vitest';
import { rankCandidateEvidence, type CandidateRankingInput } from './candidate-ranking';

function candidate(
  moveUci: string,
  population: CandidateRankingInput['population'],
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
    population,
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

describe('Surprise persona empirical qualification', () => {
  it('does not reward rarity when the move fails to materially beat the position baseline', () => {
    const rareUnderperformer = candidate('a2a3', {
      status: 'AVAILABLE',
      games: 100,
      frequencyPercent: 5,
      scorePercentForTarget: 45,
      positionBaselineScorePercentForTarget: 50,
    });
    const supportedOverperformer = candidate('b2b3', {
      status: 'AVAILABLE',
      games: 100,
      frequencyPercent: 12,
      scorePercentForTarget: 55,
      positionBaselineScorePercentForTarget: 50,
    });

    const ranked = rankCandidateEvidence([rareUnderperformer, supportedOverperformer], {
      role: 'USER_MOVE',
      speedPreset: 'BLITZ_AND_SLOWER',
      riskTolerance: 'HIGH',
      allowDeliberatelyDubious: true,
      persona: 'SURPRISE',
    });

    expect(ranked[0].input.moveUci).toBe('b2b3');
    expect(ranked[0].reasonCodes).toContain('POPULATION_STRONG_SCORE');
    expect(ranked[1].reasonCodes).not.toContain('POPULATION_STRONG_SCORE');
  });

  it('does not let Master rarity bypass the population overperformance gate', () => {
    const rareNotQualified = candidate('a2a3', {
      status: 'AVAILABLE',
      games: 100,
      frequencyPercent: 1,
      scorePercentForTarget: 52,
      positionBaselineScorePercentForTarget: 50,
    });
    rareNotQualified.masters.frequencyPercent = 0.1;

    const qualified = candidate('b2b3', {
      status: 'AVAILABLE',
      games: 100,
      frequencyPercent: 20,
      scorePercentForTarget: 53,
      positionBaselineScorePercentForTarget: 50,
    });
    qualified.masters.frequencyPercent = 10;

    const ranked = rankCandidateEvidence([rareNotQualified, qualified], {
      role: 'USER_MOVE',
      speedPreset: 'BLITZ_AND_SLOWER',
      riskTolerance: 'HIGH',
      allowDeliberatelyDubious: true,
      persona: 'SURPRISE',
    });

    expect(ranked[0].input.moveUci).toBe('b2b3');
    expect(ranked[0].reasonCodes).toContain('POPULATION_STRONG_SCORE');
    expect(ranked[1].reasonCodes).not.toContain('POPULATION_STRONG_SCORE');
  });

  it('keeps a fixed policy sample floor even when upstream marks a tiny sample available', () => {
    const tinyAvailable = candidate('a2a3', {
      status: 'AVAILABLE',
      games: 1,
      frequencyPercent: 0.1,
      scorePercentForTarget: 100,
      positionBaselineScorePercentForTarget: 50,
    });
    const supportedOverperformer = candidate('b2b3', {
      status: 'AVAILABLE',
      games: 40,
      frequencyPercent: 8,
      scorePercentForTarget: 60,
      positionBaselineScorePercentForTarget: 50,
    });

    const ranked = rankCandidateEvidence([tinyAvailable, supportedOverperformer], {
      role: 'USER_MOVE',
      speedPreset: 'BLITZ_AND_SLOWER',
      riskTolerance: 'HIGH',
      allowDeliberatelyDubious: true,
      persona: 'SURPRISE',
    });
    const tinyRanked = ranked.find((entry) => entry.input.moveUci === 'a2a3');

    expect(ranked[0].input.moveUci).toBe('b2b3');
    expect(tinyRanked?.components.population).toBe(0);
    expect(tinyRanked?.reasonCodes).not.toContain('POPULATION_STRONG_SCORE');
  });

  it('marks missing objective proof as a warning without inventing an objective loss', () => {
    const uncommon = candidate('h2h3', {
      status: 'AVAILABLE',
      games: 80,
      frequencyPercent: 5,
      scorePercentForTarget: 60,
      positionBaselineScorePercentForTarget: 50,
    });
    uncommon.engine = {
      status: 'INSUFFICIENT',
      depth: null,
      mateForTarget: null,
      objectiveDeltaCp: null,
    };

    const ranked = rankCandidateEvidence([uncommon], {
      role: 'USER_MOVE',
      speedPreset: 'BLITZ_AND_SLOWER',
      riskTolerance: 'HIGH',
      allowDeliberatelyDubious: true,
      persona: 'SURPRISE',
    })[0];

    expect(ranked.eligibility).toBe('WARNING');
    expect(ranked.components.objective).toBe(0);
    expect(ranked.warningCodes).toContain('OBJECTIVE_EVIDENCE_MISSING');
    expect(ranked.warningCodes).not.toContain('OBJECTIVE_LOSS');
  });

  it('does not exclude or label objective loss from an insufficient low-depth delta', () => {
    const uncommon = candidate('h2h3', {
      status: 'AVAILABLE',
      games: 80,
      frequencyPercent: 5,
      scorePercentForTarget: 60,
      positionBaselineScorePercentForTarget: 50,
    });
    uncommon.engine = {
      status: 'INSUFFICIENT',
      depth: 8,
      mateForTarget: null,
      objectiveDeltaCp: 300,
    };

    const ranked = rankCandidateEvidence([uncommon], {
      role: 'USER_MOVE',
      speedPreset: 'BLITZ_AND_SLOWER',
      riskTolerance: 'HIGH',
      allowDeliberatelyDubious: true,
      persona: 'SURPRISE',
    })[0];

    expect(ranked.eligibility).toBe('WARNING');
    expect(ranked.components.objective).toBe(0);
    expect(ranked.warningCodes).toContain('OBJECTIVE_EVIDENCE_MISSING');
    expect(ranked.warningCodes).toContain('LOW_ENGINE_DEPTH');
    expect(ranked.warningCodes).not.toContain('OBJECTIVE_LOSS');
    expect(ranked.reasonCodes).not.toContain('OBJECTIVE_COST');
  });
});
