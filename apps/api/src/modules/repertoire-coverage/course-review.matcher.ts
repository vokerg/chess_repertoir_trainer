import { Chess } from 'chess.js';
import { getMoveSequenceFromUci, normalizeFenForPosition, RepertoireGraph } from 'chess-domain';
import {
  CourseReviewGameMetadata,
  CourseReviewGameResult,
  CourseReviewGameStatus,
  CourseReviewPly,
  RepertoireColor,
} from './repertoire-coverage.types';

export function sideToMove(normalizedFen: string): RepertoireColor {
  const side = normalizedFen.split(/\s+/)[1];
  if (side === 'w') return 'WHITE';
  if (side === 'b') return 'BLACK';
  throw new Error(`Invalid normalized FEN: ${normalizedFen}`);
}

function baseResult(
  game: CourseReviewGameMetadata,
  status: CourseReviewGameStatus,
): CourseReviewGameResult {
  return {
    ...game,
    endedAt: game.endedAt?.toISOString() ?? null,
    status,
    plyNumber: null,
    normalizedFenBefore: null,
    sideToMove: null,
    expectedMoveUci: null,
    expectedMoveUcis: [],
    expectedMoveSans: [],
    playedMoveUci: null,
    playedSan: null,
    moveSequenceSan: null,
  };
}

function getMoveSequence(plies: CourseReviewPly[], upToPlyIndex: number): string {
  const sorted = [...plies].sort((a, b) => a.plyNumber - b.plyNumber);
  const relevantPlies = sorted.slice(0, upToPlyIndex + 1);
  if (relevantPlies.length === 0) return '';

  const startingFen = relevantPlies[0].normalizedFenBefore;
  const ucis = relevantPlies.map((p) => p.moveUci);
  return getMoveSequenceFromUci(startingFen, ucis);
}

function atPly(
  game: CourseReviewGameMetadata,
  status: CourseReviewGameStatus,
  ply: CourseReviewPly,
  side: RepertoireColor,
  plies: CourseReviewPly[],
  plyIndex: number,
): CourseReviewGameResult {
  return {
    ...baseResult(game, status),
    plyNumber: ply.plyNumber,
    normalizedFenBefore: ply.normalizedFenBefore,
    sideToMove: side,
    playedMoveUci: ply.moveUci,
    moveSequenceSan: getMoveSequence(plies, plyIndex),
  };
}

function belowMinimumOverlap(coveredPlies: number, minCoveredPlies: number): boolean {
  return coveredPlies < minCoveredPlies;
}

function opponentMoveTransposesToKnownPosition(
  graph: RepertoireGraph,
  normalizedFenBefore: string,
  moveUci: string,
): boolean {
  try {
    const chess = new Chess(`${normalizedFenBefore} 0 1`);
    chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci[4],
    });
    const normalizedFenAfter = normalizeFenForPosition(chess.fen());
    return graph.positions.has(normalizedFenAfter);
  } catch {
    return false;
  }
}

export type RepertoireSequenceStatus =
  | 'COVERED'
  | 'MY_DEVIATION'
  | 'OPPONENT_UNCOVERED'
  | 'REPERTOIRE_ENDED'
  | 'NOT_COVERED'
  | 'COURSE_CONFLICT';

export interface RepertoireSequenceMatch {
  status: RepertoireSequenceStatus;
  coveredPlies: number;
  deviationPly: number | null;
  expectedMoveUcis: string[];
  expectedMoveSans: string[];
}

export function classifyRepertoireSequence(input: {
  plies: CourseReviewPly[];
  graph: RepertoireGraph;
  sideToTrain: RepertoireColor;
  minCoveredPlies?: number;
  reportUserMoveConflicts?: boolean;
}): RepertoireSequenceMatch {
  const plies = [...input.plies].sort((a, b) => a.plyNumber - b.plyNumber);
  const startIndex = plies.findIndex((ply) => input.graph.startPositions.has(ply.normalizedFenBefore));
  if (startIndex < 0) return sequenceResult('NOT_COVERED', 0);

  const minCoveredPlies = input.minCoveredPlies ?? 1;
  let coveredPlies = 0;
  for (let index = startIndex; index < plies.length; index += 1) {
    const ply = plies[index];
    const position = input.graph.positions.get(ply.normalizedFenBefore);
    if (!position) {
      return belowMinimumOverlap(coveredPlies, minCoveredPlies)
        ? sequenceResult('NOT_COVERED', coveredPlies)
        : sequenceResult('REPERTOIRE_ENDED', coveredPlies, ply.plyNumber);
    }

    if (position.sideToMove === input.sideToTrain) {
      const correctMoves = [...position.userMoves.values()];
      if (input.reportUserMoveConflicts && correctMoves.length > 1) {
        return sequenceResult('COURSE_CONFLICT', coveredPlies, ply.plyNumber, correctMoves);
      }
      if (correctMoves.length === 0) {
        return belowMinimumOverlap(coveredPlies, minCoveredPlies)
          ? sequenceResult('NOT_COVERED', coveredPlies)
          : sequenceResult('REPERTOIRE_ENDED', coveredPlies, ply.plyNumber);
      }
      if (!correctMoves.some((move) => move.moveUci === ply.moveUci)) {
        return belowMinimumOverlap(coveredPlies, minCoveredPlies)
          ? sequenceResult('NOT_COVERED', coveredPlies)
          : sequenceResult('MY_DEVIATION', coveredPlies, ply.plyNumber, correctMoves);
      }
      coveredPlies += 1;
      continue;
    }

    if (
      position.opponentMoves.has(ply.moveUci)
      || opponentMoveTransposesToKnownPosition(input.graph, ply.normalizedFenBefore, ply.moveUci)
    ) {
      coveredPlies += 1;
      continue;
    }
    return belowMinimumOverlap(coveredPlies, minCoveredPlies)
      ? sequenceResult('NOT_COVERED', coveredPlies)
      : sequenceResult(
          'OPPONENT_UNCOVERED',
          coveredPlies,
          ply.plyNumber,
          [...position.opponentMoves.values()],
        );
  }

  return belowMinimumOverlap(coveredPlies, minCoveredPlies)
    ? sequenceResult('NOT_COVERED', coveredPlies)
    : sequenceResult('COVERED', coveredPlies);
}

function sequenceResult(
  status: RepertoireSequenceStatus,
  coveredPlies: number,
  deviationPly: number | null = null,
  expectedMoves: Array<{ moveUci: string; moveSan: string }> = [],
): RepertoireSequenceMatch {
  return {
    status,
    coveredPlies,
    deviationPly,
    expectedMoveUcis: expectedMoves.map((move) => move.moveUci),
    expectedMoveSans: expectedMoves.map((move) => move.moveSan),
  };
}

export function classifyCourseReviewGame(input: {
  game: CourseReviewGameMetadata;
  indexed: boolean;
  plies: CourseReviewPly[] | null;
  graph: RepertoireGraph;
  sideToTrain: RepertoireColor | null;
  minCoveredPlies: number;
}): CourseReviewGameResult {
  if (!input.indexed || !input.plies?.length) {
    return baseResult(input.game, 'UNINDEXED_GAME');
  }

  const plies = [...input.plies].sort((a, b) => a.plyNumber - b.plyNumber);
  const trainedSide = input.sideToTrain ?? input.game.userColor;
  if (!trainedSide) return baseResult(input.game, 'OUT_OF_SCOPE');
  const match = classifyRepertoireSequence({
    plies,
    graph: input.graph,
    sideToTrain: trainedSide,
    minCoveredPlies: input.minCoveredPlies,
    reportUserMoveConflicts: true,
  });
  if (match.status === 'NOT_COVERED') return baseResult(input.game, 'OUT_OF_SCOPE');
  if (match.status === 'COVERED') return baseResult(input.game, 'GAME_ENDED_INSIDE_REPERTOIRE');

  const plyIndex = plies.findIndex((ply) => ply.plyNumber === match.deviationPly);
  if (plyIndex < 0) return baseResult(input.game, 'UNINDEXED_GAME');
  const ply = plies[plyIndex];
  let side: RepertoireColor;
  try {
    side = input.graph.positions.get(ply.normalizedFenBefore)?.sideToMove
      ?? sideToMove(ply.normalizedFenBefore);
  } catch {
    return baseResult(input.game, 'UNINDEXED_GAME');
  }
  const result = atPly(input.game, match.status, ply, side, plies, plyIndex);
  if (match.status !== 'OPPONENT_UNCOVERED') {
    result.expectedMoveUci = match.expectedMoveUcis[0] ?? null;
    result.expectedMoveUcis = match.expectedMoveUcis;
    result.expectedMoveSans = match.expectedMoveSans;
  }
  return result;
}
