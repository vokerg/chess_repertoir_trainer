import type { ParamMap, Params } from '@angular/router';
import type { RepertoireTargetStartingPoint } from '@chess-trainer/contracts/repertoire-target';
import { Chess } from 'chess.js';

const SOURCE = 'course-ending' as const;
const INTENT = 'extend-existing-line' as const;
const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export interface CourseEndingBuilderLaunchInput {
  courseId: number;
  courseName: string;
  chapterId: number;
  lineId: number;
  lineName: string;
  nodeId: number;
  startingFen: string;
  side: 'WHITE' | 'BLACK';
  observedMoveUci: string;
  observedMoveSan: string | null;
  observedGameCount: number;
  minGames: number;
  sourceKey: string;
  sequence: string | null;
  results: {
    win: number;
    draw: number;
    loss: number;
    unknown: number;
  };
  filterSummary: string;
  sourceFilters: string;
}

export interface RepertoireBuilderCourseEndingLaunch extends CourseEndingBuilderLaunchInput {
  source: 'COURSE_ENDING';
  intent: 'EXTEND_EXISTING_LINE';
}

export interface RepertoireBuilderLaunchParseResult {
  context: RepertoireBuilderCourseEndingLaunch | null;
  error: string | null;
}

export function buildCourseEndingBuilderLaunchQueryParams(
  input: CourseEndingBuilderLaunchInput,
): Params {
  return {
    source: SOURCE,
    intent: INTENT,
    courseId: input.courseId,
    courseName: input.courseName,
    chapterId: input.chapterId,
    lineId: input.lineId,
    lineName: input.lineName,
    nodeId: input.nodeId,
    fen: input.startingFen,
    side: input.side,
    moveUci: input.observedMoveUci,
    moveSan: input.observedMoveSan ?? undefined,
    games: input.observedGameCount,
    minGames: input.minGames,
    sourceKey: input.sourceKey,
    sequence: input.sequence ?? undefined,
    wins: input.results.win,
    draws: input.results.draw,
    losses: input.results.loss,
    unknown: input.results.unknown,
    filterSummary: input.filterSummary,
    sourceFilters: input.sourceFilters,
  };
}

export function parseRepertoireBuilderLaunch(params: ParamMap): RepertoireBuilderLaunchParseResult {
  const source = params.get('source');
  if (!source) return { context: null, error: null };
  if (source !== SOURCE) {
    return { context: null, error: 'This builder launch source is not supported.' };
  }
  if (params.get('intent') !== INTENT) {
    return { context: null, error: 'This builder launch intent is not supported.' };
  }

  const courseId = positiveInteger(params.get('courseId'));
  const chapterId = positiveInteger(params.get('chapterId'));
  const lineId = positiveInteger(params.get('lineId'));
  const nodeId = positiveInteger(params.get('nodeId'));
  const observedGameCount = positiveInteger(params.get('games'));
  const minGames = positiveInteger(params.get('minGames'));
  const results = {
    win: nonnegativeInteger(params.get('wins')),
    draw: nonnegativeInteger(params.get('draws')),
    loss: nonnegativeInteger(params.get('losses')),
    unknown: nonnegativeInteger(params.get('unknown')),
  };
  const courseName = boundedText(params.get('courseName'), 200);
  const lineName = boundedText(params.get('lineName'), 200);
  const sourceKey = boundedText(params.get('sourceKey'), 500);
  const sequence = optionalBoundedText(params.get('sequence'), 2_000);
  const filterSummary = boundedText(params.get('filterSummary'), 1_000);
  const sourceFilters = boundedTextAllowEmpty(params.get('sourceFilters'), 8_000);
  const startingFen = fullFen(params.get('fen'));
  const side = params.get('side');
  const observedMoveUci = params.get('moveUci')?.trim().toLowerCase() ?? '';
  const observedMoveSan = optionalBoundedText(params.get('moveSan'), 30);

  if (
    courseId === null
    || chapterId === null
    || lineId === null
    || nodeId === null
    || observedGameCount === null
    || minGames === null
    || results.win === null
    || results.draw === null
    || results.loss === null
    || results.unknown === null
    || !courseName
    || !lineName
    || !sourceKey
    || !filterSummary
    || sourceFilters === null
    || !startingFen
    || (side !== 'WHITE' && side !== 'BLACK')
    || !UCI_PATTERN.test(observedMoveUci)
  ) {
    return {
      context: null,
      error: 'This Course ending link is incomplete or no longer valid. Open it again from Course review.',
    };
  }

  return {
    context: {
      source: 'COURSE_ENDING',
      intent: 'EXTEND_EXISTING_LINE',
      courseId,
      courseName,
      chapterId,
      lineId,
      lineName,
      nodeId,
      startingFen,
      side,
      observedMoveUci,
      observedMoveSan,
      observedGameCount,
      minGames,
      sourceKey,
      sequence,
      results: {
        win: results.win,
        draw: results.draw,
        loss: results.loss,
        unknown: results.unknown,
      },
      filterSummary,
      sourceFilters,
    },
    error: null,
  };
}

export function builderLaunchStartingPoint(
  context: RepertoireBuilderCourseEndingLaunch | null,
): RepertoireTargetStartingPoint {
  return context
    ? { kind: 'COURSE_POSITION', courseId: context.courseId, lineId: context.lineId }
    : { kind: 'INITIAL_POSITION' };
}

export function builderLaunchReturnUrl(context: RepertoireBuilderCourseEndingLaunch): string {
  return `/courses/${context.courseId}/review?view=endings`;
}

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonnegativeInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function boundedText(value: string | null, maxLength: number): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function boundedTextAllowEmpty(value: string | null, maxLength: number): string | null {
  if (value === null || value.length > maxLength) return null;
  return value;
}

function optionalBoundedText(value: string | null, maxLength: number): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.length <= maxLength ? trimmed : null;
}

function fullFen(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed.length > 200) return null;
  const parts = trimmed.split(/\s+/);
  const candidate = parts.length === 4 ? `${trimmed} 0 1` : trimmed;
  try {
    return new Chess(candidate).fen();
  } catch {
    return null;
  }
}
