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
    expect(ranked.warningCodes).toContain('OBJECTIVE_EVIDENCE_MISSING');
    expect(ranked.warningCodes).not.toContain('OBJECTIVE_LOSS');
  });
});
