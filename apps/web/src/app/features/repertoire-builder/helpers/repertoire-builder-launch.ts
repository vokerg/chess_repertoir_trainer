import type { ParamMap, Params } from '@angular/router';
import type { RepertoireTargetStartingPoint } from '@chess-trainer/contracts/repertoire-target';
import { Chess } from 'chess.js';
import {
  isRepertoireBuilderProfileLaunch,
  parseRepertoireBuilderProfileLaunch,
  type RepertoireBuilderProfileLaunch,
} from '../profile-launch';

const COURSE_ENDING_SOURCE = 'course-ending' as const;
const OPPONENT_GAP_SOURCE = 'opponent-gap' as const;
const EXTEND_INTENT = 'extend-existing-line' as const;
const COVER_GAP_INTENT = 'cover-opponent-gap' as const;
const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export type RepertoireBuilderLaunchAnchorKind = 'LINE_START' | 'NODE';

interface CourseFindingBuilderLaunchBaseInput {
  courseId: number;
  courseName: string;
  chapterId: number;
  lineId: number;
  lineName: string;
  anchorKind: RepertoireBuilderLaunchAnchorKind;
  nodeId: number | null;
  startingFen: string;
  side: 'WHITE' | 'BLACK';
  observedMoveUci: string;
  observedMoveSan: string | null;
  observedGameCount: number;
  sourceKey: string;
  sequence: string | null;
  results: { win: number; draw: number; loss: number; unknown: number };
  filterSummary: string;
  sourceFilters: string;
}

export interface CourseEndingBuilderLaunchInput extends CourseFindingBuilderLaunchBaseInput {
  anchorKind: 'NODE';
  nodeId: number;
  minGames: number;
}

export interface OpponentGapBuilderLaunchInput extends CourseFindingBuilderLaunchBaseInput {
  minCoveredPlies: number;
}

export interface RepertoireBuilderCourseEndingLaunchContext extends CourseEndingBuilderLaunchInput {
  source: 'COURSE_ENDING';
  intent: 'EXTEND_EXISTING_LINE';
}

export interface RepertoireBuilderOpponentGapLaunch extends OpponentGapBuilderLaunchInput {
  source: 'OPPONENT_GAP';
  intent: 'COVER_OPPONENT_GAP';
}

export type RepertoireBuilderCourseFindingLaunch =
  | RepertoireBuilderCourseEndingLaunchContext
  | RepertoireBuilderOpponentGapLaunch;

export type RepertoireBuilderLaunchContext =
  | RepertoireBuilderCourseFindingLaunch
  | RepertoireBuilderProfileLaunch;

// Compatibility name used only by the route-local builder store. Historical in-memory
// Course-ending fixtures predate explicit anchorKind; parsed external links remain strict.
export type RepertoireBuilderCourseEndingLaunch =
  | RepertoireBuilderCourseFindingLaunch
  | (Omit<RepertoireBuilderCourseEndingLaunchContext, 'anchorKind'> & { anchorKind?: 'NODE' });

export interface RepertoireBuilderLaunchParseResult {
  context: RepertoireBuilderLaunchContext | null;
  error: string | null;
}

export function buildCourseEndingBuilderLaunchQueryParams(input: CourseEndingBuilderLaunchInput): Params {
  return { ...buildCommonQueryParams(input), source: COURSE_ENDING_SOURCE, intent: EXTEND_INTENT, minGames: input.minGames };
}

export function buildOpponentGapBuilderLaunchQueryParams(input: OpponentGapBuilderLaunchInput): Params {
  return { ...buildCommonQueryParams(input), source: OPPONENT_GAP_SOURCE, intent: COVER_GAP_INTENT, minCoveredPlies: input.minCoveredPlies };
}

export function parseRepertoireBuilderLaunch(params: ParamMap, now = new Date()): RepertoireBuilderLaunchParseResult {
  const source = params.get('source');
  if (!source) return { context: null, error: null };
  if (source === 'player-profile') return parseRepertoireBuilderProfileLaunch(params, now);
  if (source !== COURSE_ENDING_SOURCE && source !== OPPONENT_GAP_SOURCE) {
    return { context: null, error: 'This builder launch source is not supported.' };
  }

  const expectedIntent = source === COURSE_ENDING_SOURCE ? EXTEND_INTENT : COVER_GAP_INTENT;
  if (params.get('intent') !== expectedIntent) {
    return { context: null, error: 'This builder launch intent is not supported.' };
  }

  const courseId = positiveInteger(params.get('courseId'));
  const chapterId = positiveInteger(params.get('chapterId'));
  const lineId = positiveInteger(params.get('lineId'));
  const anchorKind = launchAnchorKind(params.get('anchorKind'), source);
  const nodeId = anchorKind === 'NODE' ? positiveInteger(params.get('nodeId')) : null;
  const observedGameCount = positiveInteger(params.get('games'));
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
  const rawSide = params.get('side');
  const side: 'WHITE' | 'BLACK' | null = rawSide === 'WHITE' || rawSide === 'BLACK' ? rawSide : null;
  const observedMoveUci = params.get('moveUci')?.trim().toLowerCase() ?? '';
  const observedMoveSan = optionalBoundedText(params.get('moveSan'), 30);

  if (
    courseId === null || chapterId === null || lineId === null || anchorKind === null
    || (anchorKind === 'NODE' && nodeId === null) || observedGameCount === null
    || results.win === null || results.draw === null || results.loss === null || results.unknown === null
    || !courseName || !lineName || !sourceKey || !filterSummary || sourceFilters === null
    || !startingFen || side === null || !UCI_PATTERN.test(observedMoveUci)
  ) return invalidLaunch(source);

  const common = {
    courseId, courseName, chapterId, lineId, lineName, anchorKind, nodeId, startingFen, side,
    observedMoveUci, observedMoveSan, observedGameCount, sourceKey, sequence,
    results: { win: results.win, draw: results.draw, loss: results.loss, unknown: results.unknown },
    filterSummary, sourceFilters,
  };

  if (source === COURSE_ENDING_SOURCE) {
    const minGames = boundedInteger(params.get('minGames'), 1, 1000);
    if (minGames === null || anchorKind !== 'NODE' || nodeId === null) return invalidLaunch(source);
    return {
      context: { ...common, source: 'COURSE_ENDING', intent: 'EXTEND_EXISTING_LINE', anchorKind: 'NODE', nodeId, minGames },
      error: null,
    };
  }

  const minCoveredPlies = boundedInteger(params.get('minCoveredPlies'), 0, 20);
  if (minCoveredPlies === null) return invalidLaunch(source);
  return { context: { ...common, source: 'OPPONENT_GAP', intent: 'COVER_OPPONENT_GAP', minCoveredPlies }, error: null };
}

export function builderLaunchStartingPoint(
  context: RepertoireBuilderLaunchContext | RepertoireBuilderCourseEndingLaunch | null,
): RepertoireTargetStartingPoint {
  return context && isRepertoireBuilderCourseFindingLaunch(context)
    ? { kind: 'COURSE_POSITION', courseId: context.courseId, lineId: context.lineId }
    : { kind: 'INITIAL_POSITION' };
}

export function builderLaunchReturnUrl(context: RepertoireBuilderLaunchContext): string {
  if (isRepertoireBuilderProfileLaunch(context)) return '/progress/profile';
  const query = new URLSearchParams(context.sourceFilters);
  query.set('restore', '1');
  if (context.source === 'COURSE_ENDING') {
    query.set('view', 'course-endings');
    query.set('minGames', String(context.minGames));
  } else {
    query.set('view', 'opponent-gaps');
    query.set('minCoveredPlies', String(context.minCoveredPlies));
  }
  return `/courses/${context.courseId}/review?${query.toString()}`;
}

export function isRepertoireBuilderCourseFindingLaunch(
  context: RepertoireBuilderLaunchContext | RepertoireBuilderCourseEndingLaunch | null,
): context is RepertoireBuilderCourseFindingLaunch {
  return Boolean(context && !isRepertoireBuilderProfileLaunch(context)
    && (context.source === 'COURSE_ENDING' || context.source === 'OPPONENT_GAP'));
}

function buildCommonQueryParams(input: CourseFindingBuilderLaunchBaseInput): Params {
  return {
    courseId: input.courseId, courseName: input.courseName, chapterId: input.chapterId,
    lineId: input.lineId, lineName: input.lineName, anchorKind: input.anchorKind,
    nodeId: input.nodeId ?? undefined, fen: input.startingFen, side: input.side,
    moveUci: input.observedMoveUci, moveSan: input.observedMoveSan ?? undefined,
    games: input.observedGameCount, sourceKey: input.sourceKey, sequence: input.sequence ?? undefined,
    wins: input.results.win, draws: input.results.draw, losses: input.results.loss,
    unknown: input.results.unknown, filterSummary: input.filterSummary, sourceFilters: input.sourceFilters,
  };
}

function invalidLaunch(source: typeof COURSE_ENDING_SOURCE | typeof OPPONENT_GAP_SOURCE) {
  const label = source === COURSE_ENDING_SOURCE ? 'Course ending' : 'Opponent gap';
  return { context: null, error: `This ${label} link is incomplete or no longer valid. Open it again from Course review.` };
}

function launchAnchorKind(value: string | null, source: typeof COURSE_ENDING_SOURCE | typeof OPPONENT_GAP_SOURCE): RepertoireBuilderLaunchAnchorKind | null {
  if (value === 'LINE_START' || value === 'NODE') return value;
  return source === COURSE_ENDING_SOURCE ? 'NODE' : null;
}

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonnegativeInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function boundedInteger(value: string | null, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
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
  try { return new Chess(candidate).fen(); } catch { return null; }
}
