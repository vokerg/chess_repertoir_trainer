import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import {
  mastersExplorerSnapshotSchema,
  type MastersExplorerCacheStatus,
  type MastersExplorerResponse,
  type MastersExplorerSnapshot,
  type MastersExplorerSource,
} from '@chess-trainer/contracts/masters-explorer';
import {
  defaultLichessMastersClient,
  type LichessMastersClient,
} from './lichess-masters.client';
import {
  defaultMastersExplorerAccessTokenProvider,
  type MastersExplorerAccessTokenProvider,
} from './masters-explorer-access-token.provider';
import {
  findMastersExplorerCache,
  upsertMastersExplorerCache,
  type StoredMastersExplorerCache,
  type StoreMastersExplorerCacheInput,
} from './masters-explorer.repository.prisma';

const source: MastersExplorerSource = 'LICHESS_MASTERS';
const profileVersion = 1;
const sinceYear = 2000;
const movesLimit = 12;
const topGamesLimit = 15;
const cacheTtlMs = 30 * 24 * 60 * 60 * 1_000;

export class InvalidMastersExplorerFenError extends Error {
  readonly code = 'INVALID_FEN' as const;
}

export class MastersExplorerUnavailableError extends Error {
  readonly code = 'MASTERS_EXPLORER_UNAVAILABLE' as const;
}

interface MastersExplorerRepository {
  find(
    normalizedFen: string,
    source: MastersExplorerSource,
    profileVersion: number,
  ): Promise<StoredMastersExplorerCache | null>;
  upsert(input: StoreMastersExplorerCacheInput): Promise<StoredMastersExplorerCache>;
}

interface MastersExplorerServiceDependencies {
  repository?: MastersExplorerRepository;
  client?: LichessMastersClient;
  accessTokenProvider?: MastersExplorerAccessTokenProvider;
  clock?: () => Date;
}

export interface MastersExplorerService {
  getPosition(fen: string, userId: number): Promise<MastersExplorerResponse>;
}

const defaultRepository: MastersExplorerRepository = {
  find: findMastersExplorerCache,
  upsert: upsertMastersExplorerCache,
};

export function createMastersExplorerService(
  dependencies: MastersExplorerServiceDependencies = {},
): MastersExplorerService {
  const repository = dependencies.repository ?? defaultRepository;
  const client = dependencies.client ?? defaultLichessMastersClient;
  const accessTokenProvider = dependencies.accessTokenProvider
    ?? defaultMastersExplorerAccessTokenProvider;
  const clock = dependencies.clock ?? (() => new Date());
  const inFlightByPosition = new Map<string, Promise<MastersExplorerResponse>>();

  return {
    async getPosition(inputFen: string, userId: number): Promise<MastersExplorerResponse> {
      const fen = canonicalFen(inputFen);
      const normalizedFen = normalizeFenForPosition(fen);
      const requestTime = clock();
      const untilYear = requestTime.getUTCFullYear();
      const cached = await repository.find(normalizedFen, source, profileVersion);
      const cachedSnapshot = parseStoredSnapshot(cached);

      if (cached && cachedSnapshot && isFresh(cached, requestTime, untilYear)) {
        return toResponse(fen, normalizedFen, cached, cachedSnapshot, 'HIT');
      }

      const requestKey = `${profileVersion}:${untilYear}:${normalizedFen}`;
      const existingRequest = inFlightByPosition.get(requestKey);
      if (existingRequest) return existingRequest;

      const request = refreshPosition({
        fen,
        normalizedFen,
        untilYear,
        cached,
        cachedSnapshot,
        repository,
        client,
        accessTokenProvider,
        userId,
        clock,
      });

      inFlightByPosition.set(requestKey, request);
      try {
        return await request;
      } finally {
        if (inFlightByPosition.get(requestKey) === request) {
          inFlightByPosition.delete(requestKey);
        }
      }
    },
  };
}

interface RefreshPositionInput {
  fen: string;
  normalizedFen: string;
  untilYear: number;
  cached: StoredMastersExplorerCache | null;
  cachedSnapshot: MastersExplorerSnapshot | null;
  repository: MastersExplorerRepository;
  client: LichessMastersClient;
  accessTokenProvider: MastersExplorerAccessTokenProvider;
  userId: number;
  clock: () => Date;
}

async function refreshPosition(input: RefreshPositionInput): Promise<MastersExplorerResponse> {
  try {
    const accessToken = await input.accessTokenProvider.getForUser(input.userId);
    const snapshot = await input.client.fetchPosition({
      fen: input.fen,
      sinceYear,
      untilYear: input.untilYear,
      movesLimit,
      topGamesLimit,
      accessToken,
    });
    const validatedSnapshot = mastersExplorerSnapshotSchema.parse(snapshot);
    const fetchedAt = input.clock();
    const stored = await input.repository.upsert({
      normalizedFen: input.normalizedFen,
      source,
      profileVersion,
      sinceYear,
      untilYear: input.untilYear,
      movesLimit,
      topGamesLimit,
      payload: validatedSnapshot,
      fetchedAt,
      expiresAt: new Date(fetchedAt.getTime() + cacheTtlMs),
    });

    return toResponse(
      input.fen,
      input.normalizedFen,
      stored,
      validatedSnapshot,
      'REFRESHED',
    );
  } catch {
    if (input.cached && input.cachedSnapshot) {
      return toResponse(
        input.fen,
        input.normalizedFen,
        input.cached,
        input.cachedSnapshot,
        'STALE',
      );
    }

    throw new MastersExplorerUnavailableError('Masters explorer is temporarily unavailable.');
  }
}

function canonicalFen(fen: string): string {
  try {
    return fen === 'startpos' ? new Chess().fen() : new Chess(fen).fen();
  } catch {
    throw new InvalidMastersExplorerFenError('The supplied FEN is invalid.');
  }
}

function parseStoredSnapshot(
  cached: StoredMastersExplorerCache | null,
): MastersExplorerSnapshot | null {
  if (!cached) return null;
  const parsed = mastersExplorerSnapshotSchema.safeParse(cached.payload);
  return parsed.success ? parsed.data : null;
}

function isFresh(
  cached: StoredMastersExplorerCache,
  now: Date,
  untilYear: number,
): boolean {
  return cached.source === source
    && cached.profileVersion === profileVersion
    && cached.sinceYear === sinceYear
    && cached.untilYear === untilYear
    && cached.movesLimit === movesLimit
    && cached.topGamesLimit === topGamesLimit
    && cached.expiresAt.getTime() > now.getTime();
}

function toResponse(
  fen: string,
  normalizedFen: string,
  cached: StoredMastersExplorerCache,
  snapshot: MastersExplorerSnapshot,
  status: MastersExplorerCacheStatus,
): MastersExplorerResponse {
  return {
    fen,
    normalizedFen,
    dataset: {
      source: cached.source,
      profileVersion: cached.profileVersion,
      sinceYear: cached.sinceYear,
      untilYear: cached.untilYear,
      movesLimit: cached.movesLimit,
      topGamesLimit: cached.topGamesLimit,
    },
    cache: {
      status,
      fetchedAt: cached.fetchedAt.toISOString(),
      expiresAt: cached.expiresAt.toISOString(),
    },
    ...snapshot,
  };
}

export const MastersExplorerService = createMastersExplorerService();
