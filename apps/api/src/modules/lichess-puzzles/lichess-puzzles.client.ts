import { Chess } from 'chess.js';
import {
  LichessPuzzleBatchItemPayload,
  LichessPuzzleBatchOptions,
  LichessPuzzleBatchPayload,
  LichessPuzzleBatchSolvePayload,
  LichessPuzzleSolutionSubmission,
  NormalizedLichessPuzzle,
} from './lichess-puzzle.types';
import {
  LichessPuzzlePositionError,
  reconstructLichessPuzzlePosition,
} from './lichess-puzzle-position';

const DEFAULT_BASE_URL = 'https://lichess.org';
const MAX_BATCH_SIZE = 50;
const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

interface NormalizedPuzzlePosition {
  startFen: string;
  lastMoveUci: string;
  sideToMove: 'WHITE' | 'BLACK';
}

export class LichessPuzzlesClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export class LichessPuzzlesClient {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = DEFAULT_BASE_URL,
  ) {}

  async getBatch(
    accessToken: string,
    options: LichessPuzzleBatchOptions = {},
  ): Promise<NormalizedLichessPuzzle[]> {
    const token = requireAccessToken(accessToken);
    const angle = normalizeAngle(options.angle);
    const count = normalizeBatchSize(options.count ?? 1);
    const url = new URL(`/api/puzzle/batch/${encodeURIComponent(angle)}`, this.baseUrl);
    url.searchParams.set('nb', String(count));
    if (options.difficulty) url.searchParams.set('difficulty', options.difficulty);
    if (options.color) {
      if (count !== 1) {
        throw new LichessPuzzlesClientError('Lichess puzzle color filtering requires a batch size of 1', 400);
      }
      url.searchParams.set('color', options.color);
    }

    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const payload = await readJson(response);
    if (!response.ok) throw upstreamError(response.status, payload, 'Could not fetch Lichess puzzles');

    const batch = parseBatchPayload(payload);
    return Promise.all(batch.puzzles.map((item) => this.normalizePuzzle(token, item)));
  }

  async submitBatch(
    accessToken: string,
    angleInput: string,
    solutions: readonly LichessPuzzleSolutionSubmission[],
    nextCount = 0,
  ): Promise<LichessPuzzleBatchSolvePayload> {
    const angle = normalizeAngle(angleInput);
    const count = normalizeOptionalBatchSize(nextCount);
    if (!solutions.length || solutions.length > MAX_BATCH_SIZE) {
      throw new LichessPuzzlesClientError(
        `Lichess puzzle solve batches must contain between 1 and ${MAX_BATCH_SIZE} solutions`,
        400,
      );
    }
    for (const solution of solutions) validateSolutionSubmission(solution);

    const url = new URL(`/api/puzzle/batch/${encodeURIComponent(angle)}`, this.baseUrl);
    url.searchParams.set('nb', String(count));
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireAccessToken(accessToken)}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ solutions }),
    });
    const payload = await readJson(response);
    if (!response.ok) throw upstreamError(response.status, payload, 'Could not submit Lichess puzzle results');

    return parseSolvePayload(payload);
  }

  private async normalizePuzzle(
    accessToken: string,
    item: LichessPuzzleBatchItemPayload,
  ): Promise<NormalizedLichessPuzzle> {
    const position = await this.resolvePuzzlePosition(accessToken, item);
    const solutionUci = item.puzzle.solution.map((move) => validateUciMove(move, 'solution'));
    if (!solutionUci.length) {
      throw new LichessPuzzlesClientError(`Lichess puzzle ${item.puzzle.id} has no solution moves`, 502);
    }

    return {
      providerPuzzleId: item.puzzle.id,
      providerGameId: item.game.id,
      gamePgn: item.game.pgn,
      initialPly: item.puzzle.initialPly,
      startFen: position.startFen,
      lastMoveUci: position.lastMoveUci,
      sideToMove: position.sideToMove,
      rating: item.puzzle.rating,
      plays: item.puzzle.plays,
      themes: [...item.puzzle.themes],
      solutionUci,
    };
  }

  private async resolvePuzzlePosition(
    accessToken: string,
    item: LichessPuzzleBatchItemPayload,
  ): Promise<NormalizedPuzzlePosition> {
    if (item.puzzle.fen && item.puzzle.lastMove) {
      return normalizeExplicitPosition(item.puzzle.fen, item.puzzle.lastMove);
    }

    try {
      return reconstructLichessPuzzlePosition(item.game.pgn, item.puzzle.initialPly);
    } catch (error) {
      if (!(error instanceof LichessPuzzlePositionError)) throw error;
      const detailed = await this.fetchPuzzleById(accessToken, item.puzzle.id);
      if (!detailed.puzzle.fen || !detailed.puzzle.lastMove) {
        throw new LichessPuzzlesClientError(
          `Lichess puzzle ${item.puzzle.id} did not provide a usable initial position`,
          502,
        );
      }
      return normalizeExplicitPosition(detailed.puzzle.fen, detailed.puzzle.lastMove);
    }
  }

  private async fetchPuzzleById(
    accessToken: string,
    puzzleId: string,
  ): Promise<LichessPuzzleBatchItemPayload> {
    const url = new URL(`/api/puzzle/${encodeURIComponent(puzzleId)}`, this.baseUrl);
    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw upstreamError(response.status, payload, `Could not fetch Lichess puzzle ${puzzleId}`);
    }
    const item = parseBatchItem(payload);
    if (item.puzzle.id !== puzzleId) {
      throw new LichessPuzzlesClientError('Lichess puzzle detail response returned a different puzzle', 502);
    }
    return item;
  }
}

function normalizeExplicitPosition(fen: string, lastMove: string): NormalizedPuzzlePosition {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    throw new LichessPuzzlesClientError('Lichess puzzle contains an invalid initial FEN', 502);
  }
  return {
    startFen: chess.fen(),
    lastMoveUci: validateUciMove(lastMove, 'last move'),
    sideToMove: chess.turn() === 'b' ? 'BLACK' : 'WHITE',
  };
}

function parseBatchPayload(payload: unknown): LichessPuzzleBatchPayload {
  const record = asRecord(payload, 'Lichess puzzle batch response');
  if (!Array.isArray(record['puzzles'])) {
    throw new LichessPuzzlesClientError('Lichess puzzle batch response is missing puzzles', 502);
  }
  return {
    puzzles: record['puzzles'].map(parseBatchItem),
    ...(record['glicko'] !== undefined ? { glicko: record['glicko'] } : {}),
  };
}

function parseSolvePayload(payload: unknown): LichessPuzzleBatchSolvePayload {
  const batch = parseBatchPayload(payload);
  const record = asRecord(payload, 'Lichess puzzle solve response');
  if (!Array.isArray(record['rounds'])) {
    throw new LichessPuzzlesClientError('Lichess puzzle solve response is missing rounds', 502);
  }

  return {
    ...batch,
    rounds: record['rounds'].map((entry) => {
      const round = asRecord(entry, 'Lichess puzzle round');
      return {
        id: requireString(round['id'], 'Lichess puzzle round id'),
        win: requireBoolean(round['win'], 'Lichess puzzle round win'),
        ratingDiff: requireInteger(round['ratingDiff'], 'Lichess puzzle round ratingDiff'),
      };
    }),
  };
}

function parseBatchItem(value: unknown): LichessPuzzleBatchItemPayload {
  const item = asRecord(value, 'Lichess puzzle batch item');
  const game = asRecord(item['game'], 'Lichess puzzle game');
  const puzzle = asRecord(item['puzzle'], 'Lichess puzzle');
  const solution = puzzle['solution'];
  const themes = puzzle['themes'];
  if (!Array.isArray(solution) || !solution.every((move) => typeof move === 'string')) {
    throw new LichessPuzzlesClientError('Lichess puzzle solution must be a string array', 502);
  }
  if (!Array.isArray(themes) || !themes.every((theme) => typeof theme === 'string')) {
    throw new LichessPuzzlesClientError('Lichess puzzle themes must be a string array', 502);
  }

  return {
    game: {
      id: requireString(game['id'], 'Lichess puzzle game id'),
      pgn: requireString(game['pgn'], 'Lichess puzzle game PGN'),
      rated: requireBoolean(game['rated'], 'Lichess puzzle game rated'),
      ...(typeof game['clock'] === 'string' ? { clock: game['clock'] } : {}),
    },
    puzzle: {
      id: requireString(puzzle['id'], 'Lichess puzzle id'),
      initialPly: requireInteger(puzzle['initialPly'], 'Lichess puzzle initialPly'),
      plays: requireInteger(puzzle['plays'], 'Lichess puzzle plays'),
      rating: requireInteger(puzzle['rating'], 'Lichess puzzle rating'),
      solution: [...solution],
      themes: [...themes],
      ...(typeof puzzle['fen'] === 'string' ? { fen: puzzle['fen'] } : {}),
      ...(typeof puzzle['lastMove'] === 'string' ? { lastMove: puzzle['lastMove'] } : {}),
    },
  };
}

function validateSolutionSubmission(solution: LichessPuzzleSolutionSubmission): void {
  if (!solution || typeof solution !== 'object') {
    throw new LichessPuzzlesClientError('Lichess puzzle solution submission is invalid', 400);
  }
  requireString(solution.id, 'Lichess puzzle solution id');
  requireBoolean(solution.win, 'Lichess puzzle solution win');
  requireBoolean(solution.rated, 'Lichess puzzle solution rated');
}

function validateUciMove(move: string, label: string): string {
  if (!UCI_MOVE_PATTERN.test(move)) {
    throw new LichessPuzzlesClientError(`Lichess puzzle ${label} contains invalid UCI move: ${move}`, 502);
  }
  return move;
}

function normalizeAngle(angle: string | undefined): string {
  const value = angle?.trim() || 'mix';
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new LichessPuzzlesClientError('Lichess puzzle angle is invalid', 400);
  }
  return value;
}

function normalizeBatchSize(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_BATCH_SIZE) {
    throw new LichessPuzzlesClientError(`Lichess puzzle batch size must be between 1 and ${MAX_BATCH_SIZE}`, 400);
  }
  return value;
}

function normalizeOptionalBatchSize(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_BATCH_SIZE) {
    throw new LichessPuzzlesClientError(`Lichess next batch size must be between 0 and ${MAX_BATCH_SIZE}`, 400);
  }
  return value;
}

function requireAccessToken(value: string): string {
  if (!value?.trim()) throw new LichessPuzzlesClientError('A Lichess access token is required', 401);
  return value.trim();
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LichessPuzzlesClientError(`${label} must be an object`, 502);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new LichessPuzzlesClientError(`${label} must be a non-empty string`, 502);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new LichessPuzzlesClientError(`${label} must be a boolean`, 502);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) {
    throw new LichessPuzzlesClientError(`${label} must be an integer`, 502);
  }
  return value as number;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function upstreamError(statusCode: number, payload: unknown, fallback: string): LichessPuzzlesClientError {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
  const upstreamMessage = record?.['error'] ?? record?.['message'];
  return new LichessPuzzlesClientError(
    typeof upstreamMessage === 'string' && upstreamMessage.trim()
      ? `${fallback}: ${upstreamMessage}`
      : fallback,
    statusCode,
  );
}
