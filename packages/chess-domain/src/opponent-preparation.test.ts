import { describe, expect, it } from 'vitest';
import type { CandidateRankingInput } from './candidate-ranking';
import {
  OPPONENT_PREPARATION_POLICY_VERSION,
  rankOpponentPreparationCandidates,
  selectedOpponentCoveragePercent,
} from './opponent-preparation';

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
    targetFit: 'CONFLICT',
    targetReasonCodes: ['TARGET_CHARACTER_MATCH'],
    targetWarningCodes: ['TARGET_SOUNDNESS_MISMATCH'],
    profileFit: 'CONFLICT',
    profileReasonCodes: ['PROFILE_PERFORMANCE_WARNING'],
    course: {
      status: 'INSUFFICIENT',
      covered: false,
      conflict: false,
      transposesToCoveredPosition: false,
    },
    ...overrides,
  };
}

describe('opponent preparation policy', () => {
  it('recommends materially frequent replies without using target/profile fit', () => {
    const common = candidate('e7e5', {
      population: {
        status: 'AVAILABLE',
        games: 500,
        frequencyPercent: 45,
        scorePercentForTarget: 50,
      },
    });
    const tail = candidate('a7a6', {
      population: {
        status: 'AVAILABLE',
        games: 80,
        frequencyPercent: 2,
        scorePercentForTarget: 50,
      },
    });

    const result = rankOpponentPreparationCandidates([tail, common]);

    expect(result.policyVersion).toBe(OPPONENT_PREPARATION_POLICY_VERSION);
    expect(result.candidates[0].input.moveUci).toBe('e7e5');
    expect(result.candidates[0].recommendation).toBe('RECOMMENDED');
    expect(result.candidates[0].reasonCodes).toContain('COMMON_AT_TARGET_LEVEL');
    expect(result.candidates[0].reasonCodes).not.toContain('TARGET_CHARACTER_MATCH');
    expect(result.candidates[0].reasonCodes).not.toContain('PROFILE_PERFORMANCE_WARNING');
    expect(result.candidates[1].recommendation).toBe('OPTIONAL');
  });

  it('promotes an uncommon but objectively dangerous reply without calling it common', () => {
    const common = candidate('e7e5', {
      population: {
        status: 'AVAILABLE',
        games: 500,
        frequencyPercent: 50,
        scorePercentForTarget: 50,
      },
    });
    const dangerous = candidate('g7g5', {
      engine: {
        status: 'AVAILABLE',
        depth: 20,
        mateForTarget: null,
        objectiveDeltaCp: 180,
      },
      population: {
        status: 'AVAILABLE',
        games: 60,
        frequencyPercent: 2,
        scorePercentForTarget: 50,
      },
    });

    const result = rankOpponentPreparationCandidates([common, dangerous]);
    const dangerousResult = result.candidates.find((entry) => entry.input.moveUci === 'g7g5');

    expect(dangerousResult?.recommendation).toBe('RECOMMENDED');
    expect(dangerousResult?.reasonCodes).toContain('DANGEROUS_RESPONSE');
    expect(dangerousResult?.reasonCodes).not.toContain('COMMON_AT_TARGET_LEVEL');
  });

  it('promotes a repeatedly encountered personal reply even when population frequency is low', () => {
    const repeated = candidate('b8c6', {
      population: {
        status: 'AVAILABLE',
        games: 60,
        frequencyPercent: 1.5,
        scorePercentForTarget: 50,
      },
      personal: {
        status: 'AVAILABLE',
        occurrences: 4,
        games: 4,
        scorePercent: 50,
      },
    });

    const [result] = rankOpponentPreparationCandidates([repeated]).candidates;

    expect(result.recommendation).toBe('RECOMMENDED');
    expect(result.reasonCodes).toContain('PERSONALLY_ENCOUNTERED');
    expect(result.reasonCodes).not.toContain('COMMON_AT_TARGET_LEVEL');
  });

  it('uses a relative frequency floor so a long tail is not recommended merely to hit a coverage target', () => {
    const dominant = candidate('e7e5', {
      population: {
        status: 'AVAILABLE',
        games: 800,
        frequencyPercent: 60,
        scorePercentForTarget: 50,
      },
    });
    const secondary = candidate('c7c5', {
      population: {
        status: 'AVAILABLE',
        games: 300,
        frequencyPercent: 15,
        scorePercentForTarget: 50,
      },
    });
    const tail = candidate('g7g6', {
      population: {
        status: 'AVAILABLE',
        games: 200,
        frequencyPercent: 8,
        scorePercentForTarget: 50,
      },
    });

    const result = rankOpponentPreparationCandidates([tail, secondary, dominant]);
    const byMove = new Map(result.candidates.map((entry) => [entry.input.moveUci, entry]));

    expect(byMove.get('e7e5')?.recommendation).toBe('RECOMMENDED');
    expect(byMove.get('c7c5')?.recommendation).toBe('RECOMMENDED');
    expect(byMove.get('g7g6')?.recommendation).toBe('OPTIONAL');
  });

  it('computes coverage from the replies actually selected rather than from ranking order', () => {
    const result = rankOpponentPreparationCandidates([
      candidate('e7e5', {
        population: {
          status: 'AVAILABLE',
          games: 500,
          frequencyPercent: 45,
          scorePercentForTarget: 50,
        },
      }),
      candidate('c7c5', {
        population: {
          status: 'AVAILABLE',
          games: 300,
          frequencyPercent: 30,
          scorePercentForTarget: 50,
        },
      }),
      candidate('e7e6', {
        population: {
          status: 'AVAILABLE',
          games: 200,
          frequencyPercent: 15,
          scorePercentForTarget: 50,
        },
      }),
    ]);

    expect(selectedOpponentCoveragePercent(result.candidates, new Set(['c7c5']))).toBe(30);
    expect(selectedOpponentCoveragePercent(result.candidates, new Set(['e7e5', 'e7e6']))).toBe(60);
    expect(selectedOpponentCoveragePercent(result.candidates, new Set())).toBeNull();
  });

  it('keeps course state as context without making an irrelevant reply recommended by itself', () => {
    const coveredTail = candidate('h7h6', {
      population: {
        status: 'AVAILABLE',
        games: 30,
        frequencyPercent: 1,
        scorePercentForTarget: 50,
      },
      course: {
        status: 'AVAILABLE',
        covered: true,
        conflict: false,
        transposesToCoveredPosition: false,
      },
    });

    const [result] = rankOpponentPreparationCandidates([coveredTail]).candidates;

    expect(result.recommendation).toBe('OPTIONAL');
    expect(result.reasonCodes).toContain('COURSE_ALREADY_COVERS');
  });
});
