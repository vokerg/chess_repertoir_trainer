import type { CourseReviewGroup } from '../data-access/course-review.models';
import { mapCourseReviewGroup } from './course-review-finding.mapper';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

describe('course review finding mapper', () => {
  it('keeps the displayed post-move board separate from the pre-gap builder anchor', () => {
    const group: CourseReviewGroup = {
      key: `OPPONENT_UNCOVERED:${START_FEN}:e2e4`,
      status: 'OPPONENT_UNCOVERED',
      normalizedFenBefore: START_FEN,
      sideToMove: 'WHITE',
      playedMoveUci: 'e2e4',
      playedSan: 'e4',
      moveSequenceSan: '1. e4',
      expectedMoveUci: null,
      expectedMoveUcis: [],
      expectedMoveSans: [],
      count: 6,
      results: { win: 3, draw: 1, loss: 2, unknown: 0 },
      examples: [],
      lineAnchors: [
        {
          kind: 'LINE_START',
          lineId: 13,
          lineName: 'Sicilian',
          chapterId: 11,
          nodeId: null,
          moveSequenceSan: null,
        },
      ],
    };

    const finding = mapCourseReviewGroup(group, 'OPPONENT_GAP');

    expect(finding.positionFen).not.toBe(START_FEN);
    expect(finding.builderContext).toEqual(jasmine.objectContaining({
      source: 'OPPONENT_GAP',
      startingFen: START_FEN,
      side: 'BLACK',
      observedMoveUci: 'e2e4',
    }));
    expect(finding.lineReferences).toEqual([{
      anchorKind: 'LINE_START',
      lineId: 13,
      lineName: 'Sicilian',
      chapterId: 11,
      nodeId: null,
      moveSequenceSan: null,
    }]);
  });

  it('does not expose builder context for My deviations', () => {
    const group: CourseReviewGroup = {
      key: `MY_DEVIATION:${START_FEN}:d2d4`,
      status: 'MY_DEVIATION',
      normalizedFenBefore: START_FEN,
      sideToMove: 'WHITE',
      playedMoveUci: 'd2d4',
      playedSan: 'd4',
      moveSequenceSan: '1. d4',
      expectedMoveUci: 'e2e4',
      expectedMoveUcis: ['e2e4'],
      expectedMoveSans: ['e4'],
      count: 2,
      results: { win: 1, draw: 0, loss: 1, unknown: 0 },
      examples: [],
      lineAnchors: [],
    };

    const finding = mapCourseReviewGroup(group, 'MY_DEVIATION');

    expect(finding.builderContext).toBeNull();
    expect(finding.lineReferences).toEqual([]);
  });
});
