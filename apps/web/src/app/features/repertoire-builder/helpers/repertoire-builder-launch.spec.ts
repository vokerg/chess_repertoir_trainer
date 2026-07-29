import { convertToParamMap } from '@angular/router';
import {
  builderLaunchReturnUrl,
  builderLaunchStartingPoint,
  buildCourseEndingBuilderLaunchQueryParams,
  parseRepertoireBuilderLaunch,
} from './repertoire-builder-launch';

const STARTING_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

function validQuery() {
  return buildCourseEndingBuilderLaunchQueryParams({
    courseId: 7,
    courseName: 'Black repertoire',
    chapterId: 11,
    lineId: 13,
    lineName: 'Open game',
    nodeId: 17,
    startingFen: STARTING_FEN,
    side: 'WHITE',
    observedMoveUci: 'g1f3',
    observedMoveSan: 'Nf3',
    observedGameCount: 8,
    minGames: 4,
    sourceKey: `${STARTING_FEN}:g1f3`,
    sequence: '1. e4 e5',
    results: { win: 3, draw: 2, loss: 3, unknown: 0 },
    filterSummary: 'Last 1 month · White games',
    sourceFilters: 'from=2026-06-29T00%3A00%3A00.000Z&userColor=WHITE',
  });
}

describe('repertoire builder launch payload', () => {
  it('round-trips one exact Course ending launch', () => {
    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(validQuery()));

    expect(parsed.error).toBeNull();
    expect(parsed.context).toEqual(jasmine.objectContaining({
      source: 'COURSE_ENDING',
      intent: 'EXTEND_EXISTING_LINE',
      courseId: 7,
      chapterId: 11,
      lineId: 13,
      nodeId: 17,
      startingFen: STARTING_FEN,
      observedMoveUci: 'g1f3',
      observedGameCount: 8,
    }));
    expect(builderLaunchStartingPoint(parsed.context)).toEqual({
      kind: 'COURSE_POSITION',
      courseId: 7,
      lineId: 13,
    });
    expect(builderLaunchReturnUrl(parsed.context!)).toBe('/courses/7/review?view=endings');
  });

  it('rejects malformed or incomplete external route state', () => {
    const query = { ...validQuery(), nodeId: 'not-a-number' };
    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(query));

    expect(parsed.context).toBeNull();
    expect(parsed.error).toContain('Course ending link');
  });

  it('keeps the normal builder route launch-free', () => {
    expect(parseRepertoireBuilderLaunch(convertToParamMap({}))).toEqual({
      context: null,
      error: null,
    });
    expect(builderLaunchStartingPoint(null)).toEqual({ kind: 'INITIAL_POSITION' });
  });
});
