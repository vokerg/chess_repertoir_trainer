import type { CandidateDecisionCandidate } from '@chess-trainer/contracts/candidate-decision';
import {
  candidateImpactFromPosition,
  storedCandidateEngineImpact,
  withBrowserObjectiveDeltas,
} from './repertoire-builder-engine-impact';

describe('repertoire builder engine impact', () => {
  it('keeps authoritative stored candidate evidence oriented to White for the eval bar', () => {
    const impact = storedCandidateEngineImpact(candidate('e7e5', -35, 20), 'BLACK');

    expect(impact).toEqual(
      jasmine.objectContaining({
        source: 'STORED',
        scoreCpForTarget: -35,
        scoreCpWhite: 35,
        objectiveDeltaCp: 20,
      }),
    );
  });

  it('maps a persisted resulting-position evaluation into target-side browser evidence', () => {
    const impact = candidateImpactFromPosition(
      'e7e5',
      {
        fromCache: true,
        bestScoreCpWhite: 42,
        bestMateWhite: null,
        lines: [],
      },
      'BLACK',
    );

    expect(impact).toEqual(
      jasmine.objectContaining({
        source: 'STORED',
        scoreCpForTarget: -42,
        scoreCpWhite: 42,
      }),
    );
  });

  it('calculates browser candidate cost against the safest available target evaluation', () => {
    const best = candidateImpactFromPosition(
      'e2e4',
      {
        fromCache: false,
        bestScoreCpWhite: 30,
        lines: [{ depth: 12 }],
      },
      'WHITE',
    )!;
    const alternative = candidateImpactFromPosition(
      'd2d4',
      {
        fromCache: false,
        bestScoreCpWhite: -25,
        lines: [{ depth: 12 }],
      },
      'WHITE',
    )!;

    const impacts = withBrowserObjectiveDeltas({ e2e4: best, d2d4: alternative });

    expect(impacts['e2e4']?.objectiveDeltaCp).toBe(0);
    expect(impacts['d2d4']?.objectiveDeltaCp).toBe(55);
  });
});

function candidate(
  moveUci: string,
  scoreCpForTarget: number,
  objectiveDeltaCp: number,
): CandidateDecisionCandidate {
  return {
    moveUci,
    evidence: {
      engine: {
        status: 'AVAILABLE',
        depth: 12,
        multipv: 1,
        scoreCpForTarget,
        mateForTarget: null,
        objectiveDeltaCp,
        pvUci: [moveUci],
      },
    },
  } as CandidateDecisionCandidate;
}
