import {
  lichessPuzzleDifficultySchema,
  lichessPuzzleRoundOutcomeSchema,
  lichessPuzzleRoundSourceSchema,
  lichessPuzzleRoundStatusSchema,
  lichessPuzzleSideSchema,
  lichessPuzzleUpstreamStatusSchema,
  type LichessPuzzleRound,
} from '@chess-trainer/contracts/lichess-puzzles';
import {
  parseStoredLichessPuzzleMoveAttempts,
  resolveLichessPuzzleLastMoveUci,
} from './lichess-puzzle-round.logic';
import type { LichessPuzzleRoundWithPuzzle } from './lichess-puzzles.repository.prisma';

const nullableDifficultySchema = lichessPuzzleDifficultySchema.nullable();
const nullableOutcomeSchema = lichessPuzzleRoundOutcomeSchema.nullable();

export function mapLichessPuzzleRound(
  round: LichessPuzzleRoundWithPuzzle,
): LichessPuzzleRound {
  const attempts = parseStoredLichessPuzzleMoveAttempts(round.moveAttempts);

  return {
    id: round.id,
    source: lichessPuzzleRoundSourceSchema.parse(round.source),
    angle: round.angle,
    difficulty: nullableDifficultySchema.parse(round.difficulty),
    ratedRequested: round.ratedRequested,
    status: lichessPuzzleRoundStatusSchema.parse(round.status),
    outcome: nullableOutcomeSchema.parse(round.outcome),
    currentFen: round.currentFen,
    lastMoveUci: resolveLichessPuzzleLastMoveUci(
      round.currentStep,
      attempts,
      round.puzzle.lastMoveUci,
    ),
    currentStep: round.currentStep,
    firstWrongAt: round.firstWrongAt?.toISOString() ?? null,
    learningCompletedAt: round.learningCompletedAt?.toISOString() ?? null,
    upstreamStatus: lichessPuzzleUpstreamStatusSchema.parse(round.upstreamStatus),
    ratingDiff: round.ratingDiff,
    startedAt: round.startedAt.toISOString(),
    completedAt: round.completedAt?.toISOString() ?? null,
    puzzle: {
      id: round.puzzle.id,
      rating: round.puzzle.rating,
      themes: [...round.puzzle.themes],
      startFen: round.puzzle.startFen,
      lastMoveUci: round.puzzle.lastMoveUci,
      sideToMove: lichessPuzzleSideSchema.parse(round.puzzle.sideToMove),
      solutionPlies: round.puzzle.solutionUci.length,
    },
  };
}
