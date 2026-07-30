import { convertToParamMap } from '@angular/router';
import {
  builderLaunchReturnUrl,
  builderLaunchStartingPoint,
  buildCourseEndingBuilderLaunchQueryParams,
  buildOpponentGapBuilderLaunchQueryParams,
  parseRepertoireBuilderLaunch,
} from './repertoire-builder-launch';

const STARTING_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const NORMALIZED_STARTING_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -';

function courseEndingQuery() {
  return buildCourseEndingBuilderLaunchQueryParams({
    courseId: 7,
    courseName: 'Black repertoire',
    chapterId: 11,
    lineId: 13,
    lineName: 'Open game',
    anchorKind: 'NODE',
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

function opponentGapQuery(anchorKind: 'LINE_START' | 'NODE' = 'LINE_START') {
  return buildOpponentGapBuilderLaunchQueryParams({
    courseId: 7,
    courseName: 'Black repertoire',
    chapterId: 11,
    lineId: 13,
    lineName: 'Sicilian',
    anchorKind,
    nodeId: anchorKind === 'NODE' ? 17 : null,
    startingFen: NORMALIZED_STARTING_FEN,
    side: 'BLACK',
    observedMoveUci: 'g1f3',
    observedMoveSan: 'Nf3',
    observedGameCount: 6,
    minCoveredPlies: 2,
    sourceKey: `OPPONENT_UNCOVERED:${NORMALIZED_STARTING_FEN}:g1f3`,
    sequence: anchorKind === 'NODE' ? '1. e4 e5' : null,
    results: { win: 2, draw: 1, loss: 3, unknown: 0 },
    filterSummary: 'Last 1 month · Black games',
    sourceFilters: 'from=2026-06-29T00%3A00%3A00.000Z&userColor=BLACK',
  });
}

describe('repertoire builder launch payload', () => {
  it('round-trips one exact Course ending launch', () => {
    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(courseEndingQuery()));

    expect(parsed.error).toBeNull();
    expect(parsed.context).toEqual(jasmine.objectContaining({
      source: 'COURSE_ENDING',
      intent: 'EXTEND_EXISTING_LINE',
      courseId: 7,
      chapterId: 11,
      lineId: 13,
      anchorKind: 'NODE',
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

    const returnUrl = builderLaunchReturnUrl(parsed.context!);
    const returnQuery = new URLSearchParams(returnUrl.split('?')[1]);
    expect(returnUrl.startsWith('/courses/7/review?')).toBeTrue();
    expect(returnQuery.get('view')).toBe('course-endings');
    expect(returnQuery.get('restore')).toBe('1');
    expect(returnQuery.get('minGames')).toBe('4');
    expect(returnQuery.get('userColor')).toBe('WHITE');
    expect(returnQuery.get('from')).toBe('2026-06-29T00:00:00.000Z');
  });

  it('round-trips an Opponent gap at a line start', () => {
    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(opponentGapQuery()));

    expect(parsed.error).toBeNull();
    expect(parsed.context).toEqual(jasmine.objectContaining({
      source: 'OPPONENT_GAP',
      intent: 'COVER_OPPONENT_GAP',
      anchorKind: 'LINE_START',
      nodeId: null,
      startingFen: `${NORMALIZED_STARTING_FEN} 0 1`,
      side: 'BLACK',
      minCoveredPlies: 2,
    }));

    const returnUrl = builderLaunchReturnUrl(parsed.context!);
    const returnQuery = new URLSearchParams(returnUrl.split('?')[1]);
    expect(returnQuery.get('view')).toBe('opponent-gaps');
    expect(returnQuery.get('minCoveredPlies')).toBe('2');
    expect(returnQuery.get('userColor')).toBe('BLACK');
  });

  it('accepts an Opponent gap at an exact node anchor', () => {
    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(opponentGapQuery('NODE')));

    expect(parsed.error).toBeNull();
    expect(parsed.context).toEqual(jasmine.objectContaining({
      source: 'OPPONENT_GAP',
      anchorKind: 'NODE',
      nodeId: 17,
      sequence: '1. e4 e5',
    }));
  });

  it('accepts the normalized four-field FEN emitted by Course review', () => {
    const query = {
      ...courseEndingQuery(),
      fen: NORMALIZED_STARTING_FEN,
    };

    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(query));

    expect(parsed.error).toBeNull();
    expect(parsed.context?.startingFen).toBe(`${NORMALIZED_STARTING_FEN} 0 1`);
  });

  it('rejects malformed or incomplete external route state', () => {
    const query = { ...courseEndingQuery(), nodeId: 'not-a-number' };
    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(query));

    expect(parsed.context).toBeNull();
    expect(parsed.error).toContain('Course ending link');
  });

  it('rejects an Opponent gap without an explicit anchor kind', () => {
    const query = { ...opponentGapQuery() };
    delete query.anchorKind;
    const parsed = parseRepertoireBuilderLaunch(convertToParamMap(query));

    expect(parsed.context).toBeNull();
    expect(parsed.error).toContain('Opponent gap link');
  });

  it('keeps the normal builder route launch-free', () => {
    expect(parseRepertoireBuilderLaunch(convertToParamMap({}))).toEqual({
      context: null,
      error: null,
    });
    expect(builderLaunchStartingPoint(null)).toEqual({ kind: 'INITIAL_POSITION' });
  });
});
