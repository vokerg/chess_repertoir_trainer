import { EngineAnalysis } from './stockfish-analysis.service';

const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

export function engineBestMoveForFen(
  analysis: EngineAnalysis | null | undefined,
  currentFen: string,
): string | null {
  if (!analysis || analysis.fen !== currentFen) return null;
  return engineBestMove(analysis);
}

export function engineBestMove(analysis: EngineAnalysis | null | undefined): string | null {
  if (!analysis) return null;

  const liveLineMove = firstEngineUciMove(analysis.lines[0]?.pv?.[0]);
  const finalBestMove = firstEngineUciMove(analysis.bestMove);

  return analysis.running ? liveLineMove ?? finalBestMove : finalBestMove ?? liveLineMove;
}

export function firstEngineUciMove(value?: string | null): string | null {
  const token = value?.trim().split(/\s+/)[0]?.toLowerCase();
  return token && UCI_MOVE_RE.test(token) ? token : null;
}
