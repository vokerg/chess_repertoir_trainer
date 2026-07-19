import { Chess } from 'chess.js';
import type { AiGameReviewWarning } from '@chess-trainer/contracts/ai';
import type { ImportedGameDetail } from '@chess-trainer/contracts/imported-games';

const MAX_CONTEXT_PLIES = 300;

export interface GameReviewAnalysisMove {
  plyNumber: number;
  moveNumber: number;
  side: 'WHITE' | 'BLACK';
  playedMoveUci: string;
  playedMoveSan: string | null;
  classification: string | null;
  scoreLossCp: number | null;
  bestMoveUci: string | null;
  bestScoreCpWhite: number | null;
  playedScoreCpWhite: number | null;
  bestMateWhite: number | null;
}

export interface GameReviewAnalysisRun {
  status: string;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  whiteAverageCentipawnLoss: number | null;
  blackAverageCentipawnLoss: number | null;
  summary: unknown;
  moves: GameReviewAnalysisMove[];
}

export interface AuthoritativeReviewMove {
  plyNumber: number;
  moveNumber: number;
  side: 'WHITE' | 'BLACK';
  playedMoveSan: string | null;
  bestMoveSan: string | null;
  classification: string | null;
  scoreLossCp: number | null;
}

export interface GameReviewContextResult {
  context: Record<string, unknown>;
  authoritativeMoves: Map<number, AuthoritativeReviewMove>;
  warnings: AiGameReviewWarning[];
}

export function buildGameReviewContext(
  game: ImportedGameDetail,
  run: GameReviewAnalysisRun,
): GameReviewContextResult {
  if (!game.pgn) throw new Error('Game PGN is required');

  const chess = new Chess();
  try {
    chess.loadPgn(game.pgn);
  } catch {
    throw new Error('Could not parse imported game PGN');
  }

  const history = chess.history({ verbose: true }) as Array<{
    before: string;
    san: string;
    from: string;
    to: string;
    promotion?: string;
  }>;
  const analysisByPly = new Map(run.moves.map((move) => [move.plyNumber, move]));
  const warnings = new Set<AiGameReviewWarning>();
  if (!game.opening.eco && !game.opening.name) warnings.add('OPENING_NOT_IDENTIFIED');
  if (history.length > MAX_CONTEXT_PLIES) warnings.add('INCOMPLETE_MOVE_DATA');
  if (run.moves.length < history.length) warnings.add('LIMITED_ENGINE_DATA');

  const authoritativeMoves = new Map<number, AuthoritativeReviewMove>();
  const moves = history.slice(0, MAX_CONTEXT_PLIES).map((move, index) => {
    const plyNumber = index + 1;
    const analysis = analysisByPly.get(plyNumber);
    if (!analysis) warnings.add('LIMITED_ENGINE_DATA');
    const side: 'WHITE' | 'BLACK' = plyNumber % 2 === 1 ? 'WHITE' : 'BLACK';
    const bestMoveSan = analysis?.bestMoveUci ? sanForUci(move.before, analysis.bestMoveUci) : null;
    const authoritative: AuthoritativeReviewMove = {
      plyNumber,
      moveNumber: Math.ceil(plyNumber / 2),
      side,
      playedMoveSan: move.san || analysis?.playedMoveSan || null,
      bestMoveSan,
      classification: analysis?.classification ?? null,
      scoreLossCp: analysis?.scoreLossCp ?? null,
    };
    authoritativeMoves.set(plyNumber, authoritative);

    return {
      ...authoritative,
      playedMoveUci: `${move.from}${move.to}${move.promotion ?? ''}`,
      bestMoveUci: analysis?.bestMoveUci ?? null,
      bestScoreCpWhite: analysis?.bestScoreCpWhite ?? null,
      playedScoreCpWhite: analysis?.playedScoreCpWhite ?? null,
      bestMateWhite: analysis?.bestMateWhite ?? null,
    };
  });

  const userAccuracy = game.userColor === 'BLACK' ? run.blackAccuracy : run.whiteAccuracy;

  return {
    context: {
      game: {
        userColor: game.userColor,
        resultForUser: game.resultForUser,
        speedCategory: game.speedCategory,
        rated: game.rated,
        timeControl: game.timeControl,
        opening: game.opening,
        white: game.white,
        black: game.black,
        opponentUsername: game.opponentUsername,
        deterministicTags: game.tags.map((tag) => tag.name),
      },
      analysis: {
        userAccuracy,
        whiteAccuracy: run.whiteAccuracy,
        blackAccuracy: run.blackAccuracy,
        whiteAverageCentipawnLoss: run.whiteAverageCentipawnLoss,
        blackAverageCentipawnLoss: run.blackAverageCentipawnLoss,
        classificationSummary: run.summary,
      },
      moves,
    },
    authoritativeMoves,
    warnings: [...warnings],
  };
}

function sanForUci(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.substring(4, 5) || undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}
