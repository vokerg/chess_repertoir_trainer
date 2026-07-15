import type { OpeningStruggleItem } from '../data-access/opening-struggles.models';
import {
  analysisQueryParams,
  courseCoverageLabel,
  evalLabel,
  positionBeforeMoveLabel,
  repeatedMoveLabel,
} from './opening-struggles-labels';

function item(overrides: Partial<OpeningStruggleItem> = {}): OpeningStruggleItem {
  return {
    key: 'WHITE:e2e4 e7e5 g1f3',
    parentKey: 'WHITE:e2e4 e7e5',
    userColor: 'WHITE',
    movesUci: ['e2e4', 'e7e5', 'g1f3'],
    ply: 3,
    analysisGameId: 42,
    totalReachGames: 5,
    metricGames: 5,
    wins: 0,
    draws: 0,
    losses: 5,
    winRate: 0,
    lossRate: 100,
    scorePct: 0,
    analysedMoveCount: 5,
    averageCentipawnLoss: 125,
    evalGames: 5,
    avgUserEvalCp: -154,
    bestUserEvalCp: -120,
    worstUserEvalCp: -200,
    afterPositionAnalysisId: 7,
    afterPositionNormalizedFen: 'after-position',
    afterPositionBestScoreCpWhite: -154,
    afterPositionBestMateWhite: null,
    courseCoverage: {
      status: 'NOT_COVERED',
      coveredPlies: 0,
      deviationPly: null,
      courses: [],
      expectedMoveSans: [],
    },
    ...overrides,
  };
}

describe('opening struggle labels', () => {
  it('shows the position line and move separately for a repeated mistake', () => {
    const struggle = item();

    expect(positionBeforeMoveLabel(struggle)).toBe('1. e4 e5');
    expect(repeatedMoveLabel(struggle)).toBe('Nf3');
  });

  it('links repeated mistakes before the final move and bad positions after the line', () => {
    const struggle = item();

    expect(analysisQueryParams(struggle, 'repeatedMistakes')).toEqual(jasmine.objectContaining({
      gameId: 42,
      ply: 2,
    }));
    expect(analysisQueryParams(struggle, 'badPositions')).toEqual({
      fen: 'after-position',
      gameId: 42,
      ply: 3,
    });
  });

  it('opens a first-move repeated mistake from its starting position', () => {
    const params = analysisQueryParams(item({ movesUci: ['e2e4'], ply: 1 }), 'repeatedMistakes');

    expect(params['gameId']).toBeUndefined();
    expect(params['ply']).toBeUndefined();
    expect(params['fen']).toContain(' w ');
  });

  it('formats centipawn evaluations as signed pawn values', () => {
    expect(evalLabel(-154)).toBe('-1.54');
    expect(evalLabel(125)).toBe('+1.25');
    expect(evalLabel(0)).toBe('0.00');
  });

  it('describes deviations with the move, expected reply, and course name', () => {
    expect(courseCoverageLabel(item({
      courseCoverage: {
        status: 'MY_DEVIATION',
        coveredPlies: 2,
        deviationPly: 3,
        courses: [{ id: 1, name: 'Open Games' }],
        expectedMoveSans: ['Bb5'],
      },
    }))).toBe('Your move 2. Nf3 leaves the course. Expected: Bb5. Course: Open Games.');
  });
});
