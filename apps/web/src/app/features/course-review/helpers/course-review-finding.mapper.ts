import type { CourseExtensionCandidate } from '@chess-trainer/contracts/lab';
import { Chess } from 'chess.js';
import type { CourseReviewGroup } from '../data-access/course-review.models';

export type CourseReviewFindingKind = 'MY_DEVIATION' | 'OPPONENT_GAP' | 'COURSE_ENDING';

export interface CourseReviewFindingExampleViewModel {
  gameId: number;
  provider: string;
  providerUrl: string | null;
  endedAt: string | null;
  opponentUsername: string | null;
  resultForUser: 'WIN' | 'DRAW' | 'LOSS' | null;
  plyNumber: number | null;
}

export interface CourseReviewFindingLineReferenceViewModel {
  lineId: number;
  lineName: string;
  chapterId: number;
  nodeId: number;
  moveSequenceSan: string | null;
}

export interface CourseReviewEndingBuilderContextViewModel {
  sourceKey: string;
  side: 'WHITE' | 'BLACK';
  observedMoveUci: string;
  observedMoveSan: string | null;
}

export interface CourseReviewFindingViewModel {
  id: string;
  kind: CourseReviewFindingKind;
  positionFen: string;
  boardPov: 'white' | 'black';
  sequence: string | null;
  sequenceLabel: string;
  countLabel: string;
  title: string;
  description: string;
  count: number;
  results: { win: number; draw: number; loss: number; unknown: number };
  examples: readonly CourseReviewFindingExampleViewModel[];
  lineReferences: readonly CourseReviewFindingLineReferenceViewModel[];
  courseEndingBuilderContext: CourseReviewEndingBuilderContextViewModel | null;
}

export function mapCourseReviewGroup(
  group: CourseReviewGroup,
  kind: Exclude<CourseReviewFindingKind, 'COURSE_ENDING'>,
): CourseReviewFindingViewModel {
  const playedMove = group.playedSan || group.playedMoveUci;
  const expectedMoves =
    group.expectedMoveSans.join(' or ') || group.expectedMoveUcis.join(' or ') || 'a repertoire move';
  const opponentGap = kind === 'OPPONENT_GAP';

  return {
    id: `${kind}:${group.key}`,
    kind,
    positionFen: positionAfterMove(group.normalizedFenBefore, group.playedMoveUci),
    boardPov: opponentGap ? oppositePov(group.sideToMove) : colorPov(group.sideToMove),
    sequence: group.moveSequenceSan,
    sequenceLabel: 'Sequence',
    countLabel: 'Seen in',
    title: opponentGap ? `Opponent played ${playedMove}` : `${playedMove} instead of ${expectedMoves}`,
    description: opponentGap
      ? 'This opponent continuation is not covered by the course.'
      : `Expected ${expectedMoves}. You played ${playedMove}.`,
    count: group.count,
    results: group.results,
    examples: group.examples,
    lineReferences: [],
    courseEndingBuilderContext: null,
  };
}

export function mapCourseExtensionCandidate(
  candidate: CourseExtensionCandidate,
): CourseReviewFindingViewModel {
  const move = candidate.moveSan || candidate.moveUci;
  return {
    id: `COURSE_ENDING:${candidate.key}`,
    kind: 'COURSE_ENDING',
    positionFen: candidate.normalizedFen,
    boardPov: colorPov(candidate.userColor),
    sequence: candidate.lineRefs[0]?.moveSequenceSan ?? null,
    sequenceLabel: 'Course path — stops at this position',
    countLabel: 'Same position and next move in',
    title: `Next opponent move observed: ${move}`,
    description: `${move} was played immediately after this exact terminal position. The report groups the next move, not the games' full move order.`,
    count: candidate.count,
    results: candidate.results,
    examples: candidate.examples,
    lineReferences: candidate.lineRefs.map((lineRef) => ({
      lineId: lineRef.lineId,
      lineName: lineRef.lineName,
      chapterId: lineRef.chapterId,
      nodeId: lineRef.nodeId,
      moveSequenceSan: lineRef.moveSequenceSan,
    })),
    courseEndingBuilderContext: {
      sourceKey: candidate.key,
      side: candidate.userColor,
      observedMoveUci: candidate.moveUci,
      observedMoveSan: candidate.moveSan,
    },
  };
}

function positionAfterMove(fen: string, moveUci: string): string {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci[4],
    });
    return move ? chess.fen() : fen;
  } catch {
    return fen;
  }
}

function colorPov(color: 'WHITE' | 'BLACK'): 'white' | 'black' {
  return color === 'WHITE' ? 'white' : 'black';
}

function oppositePov(color: 'WHITE' | 'BLACK'): 'white' | 'black' {
  return color === 'WHITE' ? 'black' : 'white';
}
