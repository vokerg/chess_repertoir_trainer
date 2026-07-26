import { z } from 'zod';
import type {
  OpeningExplorerCounts,
  OpeningExplorerGameReference,
  OpeningExplorerOpening,
  OpeningExplorerSnapshot,
} from '@chess-trainer/contracts/opening-explorer';

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
  month: z.string().min(1).nullable().optional(),
});

const lichessExplorerResponseSchema = z.object({
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

export const lichessGamesRatingGroups = [
  0,
  1000,
  1200,
  1400,
  1600,
  1800,
  2000,
  2200,
  2500,
] as const;
export type LichessGamesRatingGroup = (typeof lichessGamesRatingGroups)[number];

export const lichessGamesSpeeds = [
  'ultraBullet',
  'bullet',
  'blitz',
  'rapid',
  'classical',
  'correspondence',
] as const;
export type LichessGamesSpeed = (typeof lichessGamesSpeeds)[number];

export interface LichessGamesPositionRequest {
  fen: string;
  sinceMonth: string;
  untilMonth: string;
  ratings: readonly LichessGamesRatingGroup[];
  speeds: readonly LichessGamesSpeed[];
  movesLimit: number;
  topGamesLimit: number;
  accessToken: string;
}

export interface LichessMastersClient {
  fetchPosition(input: LichessMastersPositionRequest): Promise<OpeningExplorerSnapshot>;
}

export interface LichessGamesClient {
  fetchPosition(input: LichessGamesPositionRequest): Promise<OpeningExplorerSnapshot>;
}

export interface LichessOpeningExplorerClient {
  fetchMastersPosition(input: LichessMastersPositionRequest): Promise<OpeningExplorerSnapshot>;
  fetchLichessGamesPosition(input: LichessGamesPositionRequest): Promise<OpeningExplorerSnapshot>;
}

export class LichessOpeningExplorerUpstreamError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
  }
}

interface LichessOpeningExplorerClientOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  nowMs?: () => number;
}

const baseUrl = 'https://explorer.lichess.org';
const rateLimitBackoffMs = 60_000;

export function createLichessOpeningExplorerClient(
  options: LichessOpeningExplorerClientOptions = {},
): LichessOpeningExplorerClient {
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

  const fetchPosition = (
    path: '/masters' | '/lichess',
    datasetLabel: string,
    accessToken: string,
    setParams: (url: URL) => void,
  ): Promise<OpeningExplorerSnapshot> => runSerialized(async () => {
    if (!accessToken.trim()) {
      throw new LichessOpeningExplorerUpstreamError(
        `A Lichess access token is required for ${datasetLabel} requests.`,
      );
    }

    if (nowMs() < blockedUntilMs) {
      throw new LichessOpeningExplorerUpstreamError(
        'Lichess opening explorer is temporarily rate limited.',
        429,
      );
    }

    const url = new URL(path, baseUrl);
    setParams(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      if (response.status === 429) {
        blockedUntilMs = nowMs() + rateLimitBackoffMs;
      }

      if (!response.ok) {
        throw new LichessOpeningExplorerUpstreamError(
          `${datasetLabel} returned HTTP ${response.status}.`,
          response.status,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new LichessOpeningExplorerUpstreamError(`${datasetLabel} returned invalid JSON.`);
      }

      const parsed = lichessExplorerResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new LichessOpeningExplorerUpstreamError(
          `${datasetLabel} returned an unexpected response.`,
        );
      }

      return mapSnapshot(parsed.data);
    } catch (error) {
      if (error instanceof LichessOpeningExplorerUpstreamError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LichessOpeningExplorerUpstreamError(`${datasetLabel} request timed out.`);
      }
      throw new LichessOpeningExplorerUpstreamError(`Could not reach ${datasetLabel}.`);
    } finally {
      clearTimeout(timeout);
    }
  });

  return {
    fetchMastersPosition(input) {
      return fetchPosition('/masters', 'Lichess Masters', input.accessToken, (url) => {
        url.searchParams.set('fen', input.fen);
        url.searchParams.set('since', String(input.sinceYear));
        url.searchParams.set('until', String(input.untilYear));
        url.searchParams.set('moves', String(input.movesLimit));
        url.searchParams.set('topGames', String(input.topGamesLimit));
      });
    },
    fetchLichessGamesPosition(input) {
      return fetchPosition('/lichess', 'Lichess games explorer', input.accessToken, (url) => {
        url.searchParams.set('fen', input.fen);
        url.searchParams.set('since', input.sinceMonth);
        url.searchParams.set('until', input.untilMonth);
        url.searchParams.set('ratings', input.ratings.join(','));
        url.searchParams.set('speeds', input.speeds.join(','));
        url.searchParams.set('moves', String(input.movesLimit));
        url.searchParams.set('topGames', String(input.topGamesLimit));
      });
    },
  };
}

export function createLichessMastersClient(
  options: LichessOpeningExplorerClientOptions = {},
): LichessMastersClient {
  const client = createLichessOpeningExplorerClient(options);
  return { fetchPosition: (input) => client.fetchMastersPosition(input) };
}

export function createLichessGamesClient(
  options: LichessOpeningExplorerClientOptions = {},
): LichessGamesClient {
  const client = createLichessOpeningExplorerClient(options);
  return { fetchPosition: (input) => client.fetchLichessGamesPosition(input) };
}

function mapSnapshot(payload: z.infer<typeof lichessExplorerResponseSchema>): OpeningExplorerSnapshot {
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
): OpeningExplorerOpening | null {
  return opening ? { eco: opening.eco, name: opening.name } : null;
}

function mapCounts(whiteWins: number, draws: number, blackWins: number): OpeningExplorerCounts {
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
): OpeningExplorerGameReference {
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

export const defaultLichessOpeningExplorerClient = createLichessOpeningExplorerClient();
export const defaultLichessMastersClient: LichessMastersClient = {
  fetchPosition: (input) => defaultLichessOpeningExplorerClient.fetchMastersPosition(input),
};
export const defaultLichessGamesClient: LichessGamesClient = {
  fetchPosition: (input) => defaultLichessOpeningExplorerClient.fetchLichessGamesPosition(input),
};
