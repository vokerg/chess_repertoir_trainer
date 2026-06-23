export interface FreeAnalysisRouteInput {
  fen: string | null;
  gameId: number | null;
  ply: number | null;
  moves: readonly string[];
}

export interface FreeAnalysisQueryLike {
  get(name: string): string | null;
}

export function freeAnalysisRouteInputFromQuery(
  query: FreeAnalysisQueryLike,
): FreeAnalysisRouteInput {
  return {
    fen: query.get('fen'),
    gameId: parsePositiveNumber(query.get('gameId')),
    ply: parsePositiveNumber(query.get('ply')),
    moves: parseMoves(query.get('moves')),
  };
}

export function sameFreeAnalysisRouteInput(
  previous: FreeAnalysisRouteInput,
  current: FreeAnalysisRouteInput,
): boolean {
  return (
    previous.fen === current.fen &&
    previous.gameId === current.gameId &&
    previous.ply === current.ply &&
    previous.moves.join(',') === current.moves.join(',')
  );
}

function parsePositiveNumber(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseMoves(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((move) => move.trim())
    .filter(Boolean);
}
