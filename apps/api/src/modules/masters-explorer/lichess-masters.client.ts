import { z } from 'zod';
import type {
  MastersExplorerCounts,
  MastersExplorerGameReference,
  MastersExplorerOpening,
  MastersExplorerSnapshot,
} from '@chess-trainer/contracts/masters-explorer';

const lichessOpeningSchema = z.object({
  eco: z.string().min(1),
  name: z.string().min(1),
});

const lichessPlayerSchema = z.object({
  name: z.string().min(1),
  rating: z.number().int().nonnegative().nullable().optional(),
});

const lichessGameSchema = z.object({
  id: z.string().min(1),
  winner: z.enum(['white', 'black']).nullable(),
  white: lichessPlayerSchema,
  black: lichessPlayerSchema,
  year: z.number().int().nonnegative(),
  month: z.string().min(1).optional(),
});

const lichessMastersResponseSchema = z.object({
  opening: lichessOpeningSchema.nullable(),
  white: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  black: z.number().int().nonnegative(),
  moves: z.array(z.object({
    uci: z.string().min(4).max(5),
    san: z.string().min(1),
    averageRating: z.number().int().nonnegative(),
    white: z.number().int().nonnegative(),
    draws: z.number().int().nonnegative(),
    black: z.number().int().nonnegative(),
    game: lichessGameSchema.nullable(),
    opening: lichessOpeningSchema.nullable(),
  })),
  topGames: z.array(lichessGameSchema.extend({
    uci: z.string().min(4).max(5),
  })),
});

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface LichessMastersPositionRequest {
  fen: string;
  sinceYear: number;
  untilYear: number;
  movesLimit: number;
  topGamesLimit: number;
  accessToken: string;
}

export interface LichessMastersClient {
  fetchPosition(input: LichessMastersPositionRequest): Promise<MastersExplorerSnapshot>;
}

export class LichessMastersUpstreamError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
  }
}

interface LichessMastersClientOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  nowMs?: () => number;
}

const baseUrl = 'https://explorer.lichess.org/masters';
const rateLimitBackoffMs = 60_000;

export function createLichessMastersClient(
  options: LichessMastersClientOptions = {},
): LichessMastersClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const nowMs = options.nowMs ?? Date.now;
  let requestQueue: Promise<void> = Promise.resolve();
  let blockedUntilMs = 0;

  const runSerialized = <T>(task: () => Promise<T>): Promise<T> => {
    const run = requestQueue.then(task, task);
    requestQueue = run.then(() => undefined, () => undefined);
    return run;
  };

  return {
    fetchPosition(input) {
      return runSerialized(async () => {
        if (!input.accessToken.trim()) {
          throw new LichessMastersUpstreamError(
            'A Lichess access token is required for Lichess Masters requests.',
          );
        }

        if (nowMs() < blockedUntilMs) {
          throw new LichessMastersUpstreamError('Lichess Masters is temporarily rate limited.', 429);
        }

        const url = new URL(baseUrl);
        url.searchParams.set('fen', input.fen);
        url.searchParams.set('since', String(input.sinceYear));
        url.searchParams.set('until', String(input.untilYear));
        url.searchParams.set('moves', String(input.movesLimit));
        url.searchParams.set('topGames', String(input.topGamesLimit));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetchImpl(url, {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${input.accessToken}`,
            },
            signal: controller.signal,
          });

          if (response.status === 429) {
            blockedUntilMs = nowMs() + rateLimitBackoffMs;
          }

          if (!response.ok) {
            throw new LichessMastersUpstreamError(
              `Lichess Masters returned HTTP ${response.status}.`,
              response.status,
            );
          }

          let payload: unknown;
          try {
            payload = await response.json();
          } catch {
            throw new LichessMastersUpstreamError('Lichess Masters returned invalid JSON.');
          }

          const parsed = lichessMastersResponseSchema.safeParse(payload);
          if (!parsed.success) {
            throw new LichessMastersUpstreamError('Lichess Masters returned an unexpected response.');
          }

          return mapSnapshot(parsed.data);
        } catch (error) {
          if (error instanceof LichessMastersUpstreamError) throw error;
          if (error instanceof Error && error.name === 'AbortError') {
            throw new LichessMastersUpstreamError('Lichess Masters request timed out.');
          }
          throw new LichessMastersUpstreamError('Could not reach Lichess Masters.');
        } finally {
          clearTimeout(timeout);
        }
      });
    },
  };
}

function mapSnapshot(payload: z.infer<typeof lichessMastersResponseSchema>): MastersExplorerSnapshot {
  return {
    opening: mapOpening(payload.opening),
    games: mapCounts(payload.white, payload.draws, payload.black),
    moves: payload.moves.map((move) => ({
      uci: move.uci,
      san: move.san,
      averageRating: move.averageRating,
      games: mapCounts(move.white, move.draws, move.black),
      opening: mapOpening(move.opening),
      representativeGame: move.game ? mapGame(move.game, null) : null,
    })),
    topGames: payload.topGames.map((game) => mapGame(game, game.uci)),
  };
}

function mapOpening(
  opening: z.infer<typeof lichessOpeningSchema> | null,
): MastersExplorerOpening | null {
  return opening ? { eco: opening.eco, name: opening.name } : null;
}

function mapCounts(whiteWins: number, draws: number, blackWins: number): MastersExplorerCounts {
  return {
    total: whiteWins + draws + blackWins,
    whiteWins,
    draws,
    blackWins,
  };
}

function mapGame(
  game: z.infer<typeof lichessGameSchema>,
  moveUci: string | null,
): MastersExplorerGameReference {
  return {
    id: game.id,
    moveUci,
    winner: game.winner === 'white' ? 'WHITE' : game.winner === 'black' ? 'BLACK' : null,
    white: { name: game.white.name, rating: game.white.rating ?? null },
    black: { name: game.black.name, rating: game.black.rating ?? null },
    year: game.year,
    month: game.month ?? null,
  };
}

export const defaultLichessMastersClient = createLichessMastersClient();
