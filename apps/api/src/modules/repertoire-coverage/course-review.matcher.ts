import {
  CourseRepertoireGraph,
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
  };
}

function atPly(
  game: CourseReviewGameMetadata,
  status: CourseReviewGameStatus,
  ply: CourseReviewPly,
  side: RepertoireColor,
): CourseReviewGameResult {
  return {
    ...baseResult(game, status),
    plyNumber: ply.plyNumber,
    normalizedFenBefore: ply.normalizedFenBefore,
    sideToMove: side,
    playedMoveUci: ply.moveUci,
  };
}

function belowMinimumOverlap(coveredPlies: number, minCoveredPlies: number): boolean {
  return coveredPlies < minCoveredPlies;
}

export function classifyCourseReviewGame(input: {
  game: CourseReviewGameMetadata;
  indexed: boolean;
  plies: CourseReviewPly[] | null;
  graph: CourseRepertoireGraph;
  sideToTrain: RepertoireColor | null;
  minCoveredPlies: number;
}): CourseReviewGameResult {
  if (!input.indexed || !input.plies?.length) {
    return baseResult(input.game, 'UNINDEXED_GAME');
  }

  const plies = [...input.plies].sort((a, b) => a.plyNumber - b.plyNumber);
  const startIndex = plies.findIndex((ply) =>
    input.graph.startPositions.has(ply.normalizedFenBefore),
  );
  if (startIndex < 0) return baseResult(input.game, 'OUT_OF_SCOPE');

  const trainedSide = input.sideToTrain ?? input.game.userColor;
  let coveredPlies = 0;
  for (let index = startIndex; index < plies.length; index++) {
    const ply = plies[index];
    const position = input.graph.positions.get(ply.normalizedFenBefore);
    let side: RepertoireColor;
    try {
      side = position?.sideToMove ?? sideToMove(ply.normalizedFenBefore);
    } catch {
      return baseResult(input.game, 'UNINDEXED_GAME');
    }

    if (!position) {
      if (belowMinimumOverlap(coveredPlies, input.minCoveredPlies)) {
        return baseResult(input.game, 'OUT_OF_SCOPE');
      }
      return atPly(input.game, 'REPERTOIRE_ENDED', ply, side);
    }

    if (trainedSide !== null && side === trainedSide) {
      const correctMoves = [...position.userMoves.values()];
      if (correctMoves.length > 1) {
        const result = atPly(input.game, 'COURSE_CONFLICT', ply, side);
        result.expectedMoveUcis = correctMoves.map((move) => move.moveUci);
        result.expectedMoveSans = correctMoves.map((move) => move.moveSan);
        return result;
      }
      if (correctMoves.length === 0) {
        if (belowMinimumOverlap(coveredPlies, input.minCoveredPlies)) {
          return baseResult(input.game, 'OUT_OF_SCOPE');
        }
        return atPly(input.game, 'REPERTOIRE_ENDED', ply, side);
      }

      const expected = correctMoves[0];
      if (ply.moveUci !== expected.moveUci) {
        if (belowMinimumOverlap(coveredPlies, input.minCoveredPlies)) {
          return baseResult(input.game, 'OUT_OF_SCOPE');
        }
        const result = atPly(input.game, 'MY_DEVIATION', ply, side);
        result.expectedMoveUci = expected.moveUci;
        result.expectedMoveUcis = [expected.moveUci];
        result.expectedMoveSans = [expected.moveSan];
        return result;
      }
      coveredPlies += 1;
      continue;
    }

    if (!position.opponentMoves.has(ply.moveUci)) {
      if (belowMinimumOverlap(coveredPlies, input.minCoveredPlies)) {
        return baseResult(input.game, 'OUT_OF_SCOPE');
      }
      return atPly(input.game, 'OPPONENT_UNCOVERED', ply, side);
    }
    coveredPlies += 1;
  }

  if (belowMinimumOverlap(coveredPlies, input.minCoveredPlies)) {
    return baseResult(input.game, 'OUT_OF_SCOPE');
  }
  return baseResult(input.game, 'GAME_ENDED_INSIDE_REPERTOIRE');
}
