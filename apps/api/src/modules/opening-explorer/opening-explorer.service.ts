import { Chess } from 'chess.js';
import { normalizeFenForPosition } from 'chess-domain';
import {
  LICHESS_GAMES_RATING_GROUPS,
  openingExplorerSnapshotSchema,
  type LichessGamesExplorerQuery,
  type LichessGamesPopulation,
  type LichessGamesPopulationSpeed,
  type LichessGamesRatingGroup,
  type LichessGamesSpeedPreset,
  type OpeningExplorerCacheStatus,
  type OpeningExplorerResponse,
  type OpeningExplorerSnapshot,
  type OpeningExplorerSource,
} from '@chess-trainer/contracts/opening-explorer';
import {
  defaultLichessGamesClient,
  defaultLichessMastersClient,
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
import {
  PeerRatingBandResolver,
  type PeerRatingBandResolver as PeerRatingBandResolverContract,
} from './peer-rating-band.service';

const profileVersion = 1;
const sinceYear = 2000;
const movesLimit = 12;
const mastersTopGamesLimit = 15;
const cacheTtlMs = 30 * 24 * 60 * 60 * 1_000;

const SPEEDS_BY_PRESET: Record<
  LichessGamesSpeedPreset,
  readonly LichessGamesPopulationSpeed[]
> = {
  ALL: ['bullet', 'blitz', 'rapid', 'classical', 'correspondence'],
  BLITZ_AND_SLOWER: ['blitz', 'rapid', 'classical', 'correspondence'],
  BLITZ: ['blitz'],
  BULLET: ['bullet'],
};

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
  peerResolver?: PeerRatingBandResolverContract;
}

export interface OpeningExplorerService {
  getPosition(
    fen: string,
    userId: number,
    query?: LichessGamesExplorerQuery,
  ): Promise<OpeningExplorerResponse>;
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
  const peerResolver = dependencies.peerResolver ?? PeerRatingBandResolver;
  const services = new Map<string, OpeningExplorerService>();

  return {
    async getPosition(fen, userId, query = defaultLichessGamesQuery(fen)) {
      const population = await resolveLichessGamesPopulation(query, userId, peerResolver);
      const ratings = sortedUnique(population.effective.ratingGroups);
      const speeds = sortedUnique(population.effective.speeds);
      const profileKey = ['', '', ratings.join(','), speeds.join(',')].join('|');
      let service = services.get(profileKey);
      if (!service) {
        service = createCachedOpeningExplorerService({
          source: 'LICHESS_GAMES',
          profileVersion: stableProfileVersion(profileKey),
          sinceYear: 0,
          movesLimit,
          topGamesLimit: 0,
          cacheTtlMs,
          fetchPosition: ({ fen: canonicalPosition, accessToken }) => client.fetchPosition({
            fen: canonicalPosition,
            sinceMonth: undefined,
            untilMonth: undefined,
            ratings,
            speeds,
            movesLimit,
            topGamesLimit: 0,
            accessToken,
          }),
          unavailableError: () => new LichessGamesExplorerUnavailableError(
            'Lichess games explorer is temporarily unavailable.',
          ),
        }, dependencies);
        services.set(profileKey, service);
      }

      const response = await service.getPosition(fen, userId);
      return { ...response, population };
    },
  };
}

export async function resolveLichessGamesPopulation(
  query: LichessGamesExplorerQuery,
  userId: number,
  peerResolver: PeerRatingBandResolverContract = PeerRatingBandResolver,
): Promise<LichessGamesPopulation> {
  const speedPreset = query.speedPreset ?? 'BLITZ_AND_SLOWER';
  const ratingTarget = query.ratingTarget ?? 'MY_PEERS_PLUS_ONE';
  const speeds = [...SPEEDS_BY_PRESET[speedPreset]];
  let ratingGroups: LichessGamesRatingGroup[];
  let peerResolution: LichessGamesPopulation['peerResolution'] = null;

  if (ratingTarget === 'ALL') {
    ratingGroups = [...LICHESS_GAMES_RATING_GROUPS];
  } else if (ratingTarget === 'GROUP') {
    if (query.ratingGroup === undefined) {
      throw new Error('ratingGroup is required when ratingTarget is GROUP.');
    }
    ratingGroups = [query.ratingGroup];
  } else {
    peerResolution = await peerResolver.resolve(userId, speedPreset);
    ratingGroups = [...peerResolution.selectedGroups];
    if (ratingTarget === 'MY_PEERS_PLUS_ONE') {
      ratingGroups = appendHigherGroup(ratingGroups);
    }
  }

  return {
    requested: {
      speedPreset,
      ratingTarget,
      ratingGroup: ratingTarget === 'GROUP' ? query.ratingGroup ?? null : null,
    },
    effective: {
      speeds: sortedUnique(speeds),
      ratingGroups: sortedUnique(ratingGroups),
    },
    peerResolution,
  };
}

function defaultLichessGamesQuery(fen: string): LichessGamesExplorerQuery {
  return {
    fen,
    speedPreset: 'BLITZ_AND_SLOWER',
    ratingTarget: 'MY_PEERS_PLUS_ONE',
  };
}

function appendHigherGroup(
  selectedGroups: readonly LichessGamesRatingGroup[],
): LichessGamesRatingGroup[] {
  const selected = sortedUnique(selectedGroups);
  const highestIndex = Math.max(...selected.map((group) => LICHESS_GAMES_RATING_GROUPS.indexOf(group)));
  const higher = LICHESS_GAMES_RATING_GROUPS[highestIndex + 1];
  return higher === undefined ? selected : [...selected, higher];
}

function sortedUnique<T extends string | number>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) => (
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right))
  ));
}

function stableProfileVersion(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 1) + 1;
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