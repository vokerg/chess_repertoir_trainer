import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import {
  openingExplorerSnapshotSchema,
  type OpeningExplorerCacheStatus,
  type OpeningExplorerResponse,
  type OpeningExplorerSnapshot,
  type OpeningExplorerSource,
} from '@chess-trainer/contracts/opening-explorer';
import {
  defaultLichessGamesClient,
  defaultLichessMastersClient,
  lichessGamesRatingGroups,
  lichessGamesSpeeds,
  type LichessGamesClient,
  type LichessMastersClient,
} from './lichess-opening-explorer.client';
import {
  defaultOpeningExplorerAccessTokenProvider,
  type OpeningExplorerAccessTokenProvider,
} from './opening-explorer-access-token.provider';
import {
  findOpeningExplorerCache,
  upsertOpeningExplorerCache,
  type StoredOpeningExplorerCache,
  type StoreOpeningExplorerCacheInput,
} from './opening-explorer.repository.prisma';

const profileVersion = 1;
const sinceYear = 2000;
const movesLimit = 12;
const mastersTopGamesLimit = 15;
const lichessGamesTopGamesLimit = 4;
const cacheTtlMs = 30 * 24 * 60 * 60 * 1_000;

export class InvalidOpeningExplorerFenError extends Error {
  readonly code = 'INVALID_FEN' as const;
}

export class MastersExplorerUnavailableError extends Error {
  readonly code = 'MASTERS_EXPLORER_UNAVAILABLE' as const;
}

export class LichessGamesExplorerUnavailableError extends Error {
  readonly code = 'LICHESS_GAMES_EXPLORER_UNAVAILABLE' as const;
}

interface OpeningExplorerRepository {
  find(
    normalizedFen: string,
    source: OpeningExplorerSource,
    profileVersion: number,
  ): Promise<StoredOpeningExplorerCache | null>;
  upsert(input: StoreOpeningExplorerCacheInput): Promise<StoredOpeningExplorerCache>;
}

interface SharedOpeningExplorerServiceDependencies {
  repository?: OpeningExplorerRepository;
  accessTokenProvider?: OpeningExplorerAccessTokenProvider;
  clock?: () => Date;
}

interface MastersExplorerServiceDependencies extends SharedOpeningExplorerServiceDependencies {
  client?: LichessMastersClient;
}

interface LichessGamesExplorerServiceDependencies extends SharedOpeningExplorerServiceDependencies {
  client?: LichessGamesClient;
}

export interface OpeningExplorerService {
  getPosition(fen: string, userId: number): Promise<OpeningExplorerResponse>;
}

interface OpeningExplorerProfile {
  source: OpeningExplorerSource;
  profileVersion: number;
  sinceYear: number;
  movesLimit: number;
  topGamesLimit: number;
  cacheTtlMs: number;
  fetchPosition(input: {
    fen: string;
    untilYear: number;
    accessToken: string;
  }): Promise<OpeningExplorerSnapshot>;
  unavailableError(): Error;
}

const defaultRepository: OpeningExplorerRepository = {
  find: findOpeningExplorerCache,
  upsert: upsertOpeningExplorerCache,
};

export function createMastersExplorerService(
  dependencies: MastersExplorerServiceDependencies = {},
): OpeningExplorerService {
  const client = dependencies.client ?? defaultLichessMastersClient;
  return createCachedOpeningExplorerService({
    source: 'LICHESS_MASTERS',
    profileVersion,
    sinceYear,
    movesLimit,
    topGamesLimit: mastersTopGamesLimit,
    cacheTtlMs,
    fetchPosition: ({ fen, untilYear, accessToken }) => client.fetchPosition({
      fen,
      sinceYear,
      untilYear,
      movesLimit,
      topGamesLimit: mastersTopGamesLimit,
      accessToken,
    }),
    unavailableError: () => new MastersExplorerUnavailableError(
      'Masters explorer is temporarily unavailable.',
    ),
  }, dependencies);
}

export function createLichessGamesExplorerService(
  dependencies: LichessGamesExplorerServiceDependencies = {},
): OpeningExplorerService {
  const client = dependencies.client ?? defaultLichessGamesClient;
  return createCachedOpeningExplorerService({
    source: 'LICHESS_GAMES',
    profileVersion,
    sinceYear,
    movesLimit,
    topGamesLimit: lichessGamesTopGamesLimit,
    cacheTtlMs,
    fetchPosition: ({ fen, untilYear, accessToken }) => client.fetchPosition({
      fen,
      sinceMonth: `${sinceYear}-01`,
      untilMonth: `${untilYear}-12`,
      ratings: lichessGamesRatingGroups,
      speeds: lichessGamesSpeeds,
      movesLimit,
      topGamesLimit: lichessGamesTopGamesLimit,
      accessToken,
    }),
    unavailableError: () => new LichessGamesExplorerUnavailableError(
      'Lichess games explorer is temporarily unavailable.',
    ),
  }, dependencies);
}

function createCachedOpeningExplorerService(
  profile: OpeningExplorerProfile,
  dependencies: SharedOpeningExplorerServiceDependencies,
): OpeningExplorerService {
  const repository = dependencies.repository ?? defaultRepository;
  const accessTokenProvider = dependencies.accessTokenProvider
    ?? defaultOpeningExplorerAccessTokenProvider;
  const clock = dependencies.clock ?? (() => new Date());
  const inFlightByPosition = new Map<string, Promise<OpeningExplorerResponse>>();

  return {
    async getPosition(inputFen: string, userId: number): Promise<OpeningExplorerResponse> {
      const fen = canonicalFen(inputFen);
      const normalizedFen = normalizeFenForPosition(fen);
      const requestTime = clock();
      const untilYear = requestTime.getUTCFullYear();
      const cached = await repository.find(
        normalizedFen,
        profile.source,
        profile.profileVersion,
      );
      const cachedSnapshot = parseStoredSnapshot(cached);

      if (cached && cachedSnapshot && isFresh(cached, profile, requestTime, untilYear)) {
        return toResponse(fen, normalizedFen, cached, cachedSnapshot, 'HIT');
      }

      const requestKey = [
        profile.source,
        profile.profileVersion,
        untilYear,
        normalizedFen,
      ].join(':');
      const existingRequest = inFlightByPosition.get(requestKey);
      if (existingRequest) return existingRequest;

      const request = refreshPosition({
        fen,
        normalizedFen,
        untilYear,
        cached,
        cachedSnapshot,
        repository,
        profile,
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
  cached: StoredOpeningExplorerCache | null;
  cachedSnapshot: OpeningExplorerSnapshot | null;
  repository: OpeningExplorerRepository;
  profile: OpeningExplorerProfile;
  accessTokenProvider: OpeningExplorerAccessTokenProvider;
  userId: number;
  clock: () => Date;
}

async function refreshPosition(input: RefreshPositionInput): Promise<OpeningExplorerResponse> {
  try {
    const accessToken = await input.accessTokenProvider.getForUser(input.userId);
    const snapshot = await input.profile.fetchPosition({
      fen: input.fen,
      untilYear: input.untilYear,
      accessToken,
    });
    const validatedSnapshot = openingExplorerSnapshotSchema.parse(snapshot);
    const fetchedAt = input.clock();
    const stored = await input.repository.upsert({
      normalizedFen: input.normalizedFen,
      source: input.profile.source,
      profileVersion: input.profile.profileVersion,
      sinceYear: input.profile.sinceYear,
      untilYear: input.untilYear,
      movesLimit: input.profile.movesLimit,
      topGamesLimit: input.profile.topGamesLimit,
      payload: validatedSnapshot,
      fetchedAt,
      expiresAt: new Date(fetchedAt.getTime() + input.profile.cacheTtlMs),
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

    throw input.profile.unavailableError();
  }
}

function canonicalFen(fen: string): string {
  try {
    return fen === 'startpos' ? new Chess().fen() : new Chess(fen).fen();
  } catch {
    throw new InvalidOpeningExplorerFenError('The supplied FEN is invalid.');
  }
}

function parseStoredSnapshot(
  cached: StoredOpeningExplorerCache | null,
): OpeningExplorerSnapshot | null {
  if (!cached) return null;
  const parsed = openingExplorerSnapshotSchema.safeParse(cached.payload);
  return parsed.success ? parsed.data : null;
}

function isFresh(
  cached: StoredOpeningExplorerCache,
  profile: OpeningExplorerProfile,
  now: Date,
  untilYear: number,
): boolean {
  return cached.source === profile.source
    && cached.profileVersion === profile.profileVersion
    && cached.sinceYear === profile.sinceYear
    && cached.untilYear === untilYear
    && cached.movesLimit === profile.movesLimit
    && cached.topGamesLimit === profile.topGamesLimit
    && cached.expiresAt.getTime() > now.getTime();
}

function toResponse(
  fen: string,
  normalizedFen: string,
  cached: StoredOpeningExplorerCache,
  snapshot: OpeningExplorerSnapshot,
  status: OpeningExplorerCacheStatus,
): OpeningExplorerResponse {
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
export const LichessGamesExplorerService = createLichessGamesExplorerService();
