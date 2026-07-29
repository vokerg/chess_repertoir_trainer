import type {
  LichessPuzzleRound,
  LichessPuzzleUpstreamStatus,
} from '@chess-trainer/contracts/lichess-puzzles';

export interface LichessPuzzleBoardLastMove {
  from: string;
  to: string;
}

export interface LichessPuzzleTrainerViewModel {
  roundId: number;
  fen: string;
  side: 'WHITE' | 'BLACK';
  lastMove: LichessPuzzleBoardLastMove | null;
  puzzleRating: number;
  progressLabel: string;
  modeLabel: string;
  syncLabel: string;
  outcomeLabel: string;
  ratingLabel: string;
  themes: readonly string[];
  guidance: string | null;
  mistakeFeedback: string | null;
  canAbandon: boolean;
  canStartNext: boolean;
  canRetrySync: boolean;
}

export function toLichessPuzzleTrainerViewModel(
  round: LichessPuzzleRound,
): LichessPuzzleTrainerViewModel {
  return {
    roundId: round.id,
    fen: round.currentFen,
    side: round.puzzle.sideToMove,
    lastMove: toBoardLastMove(round.lastMoveUci),
    puzzleRating: round.puzzle.rating,
    progressLabel: `${Math.min(round.currentStep, round.puzzle.solutionPlies)} / ${round.puzzle.solutionPlies} solution plies`,
    modeLabel: round.ratedRequested ? 'Rated' : 'Practice',
    syncLabel: toSyncLabel(round.upstreamStatus, round.ratedRequested),
    outcomeLabel: toOutcomeLabel(round),
    ratingLabel: toRatingLabel(round),
    themes: [...round.puzzle.themes],
    guidance: toGuidance(round),
    mistakeFeedback: toMistakeFeedback(round),
    canAbandon: round.status === 'IN_PROGRESS',
    canStartNext: round.status !== 'IN_PROGRESS',
    canRetrySync: round.upstreamStatus === 'FAILED',
  };
}

function toMistakeFeedback(round: LichessPuzzleRound): string | null {
  if (!round.firstWrongAt) return null;
  return round.ratedRequested
    ? 'Incorrect move. Lichess recorded this rated puzzle as a loss.'
    : 'Incorrect move. Return to the puzzle position and try again.';
}

function toBoardLastMove(moveUci: string): LichessPuzzleBoardLastMove | null {
  if (moveUci.length < 4) return null;
  return {
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
  };
}

function toOutcomeLabel(round: LichessPuzzleRound): string {
  if (round.status === 'IN_PROGRESS') return 'Your move';
  if (round.outcome === 'WIN') return 'Solved first try';
  if (round.outcome === 'LOSS') return 'Line completed after a mistake';
  return 'Round abandoned';
}

function toRatingLabel(round: LichessPuzzleRound): string {
  if (!round.ratedRequested) return 'Practice round';
  if (round.upstreamStatus === 'SYNCED') {
    const diff = round.ratingDiff ?? 0;
    return `Lichess rating ${diff >= 0 ? '+' : ''}${diff}`;
  }
  if (round.upstreamStatus === 'FAILED') return 'Lichess sync failed';
  if (round.upstreamStatus === 'PENDING' || round.upstreamStatus === 'SYNCING') {
    return 'Lichess result syncing';
  }
  return 'Rated on Lichess';
}

function toSyncLabel(
  status: LichessPuzzleUpstreamStatus,
  ratedRequested: boolean,
): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'SYNCING':
      return 'Syncing';
    case 'SYNCED':
      return 'Synced';
    case 'FAILED':
      return 'Failed';
    case 'NOT_REQUIRED':
      return ratedRequested ? 'Awaiting result' : 'Not required';
  }
}

function toGuidance(round: LichessPuzzleRound): string | null {
  if (round.status !== 'IN_PROGRESS') return null;
  if (round.firstWrongAt) {
    return 'The rated result is already a loss. Continue solving to complete the line and schedule it for review.';
  }
  return 'Find the best continuation. The opponent replies automatically.';
}
