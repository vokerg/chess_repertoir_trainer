import type {
  LichessGamesPeerEvidenceProvider,
  LichessGamesPeerEvidenceSpeed,
  LichessGamesPeerResolution,
  LichessGamesRatingGroup,
  LichessGamesSpeedPreset,
} from '@chess-trainer/contracts/opening-explorer';
import {
  LICHESS_GAMES_RATING_GROUPS,
  lichessGamesRatingGroupSchema,
} from '@chess-trainer/contracts/opening-explorer';
import type { RatingPool } from '@chess-trainer/contracts/rating-normalization';
import prisma from '../../prisma';
import { STANDARD_IMPORTED_GAME_VARIANTS } from '../imported-games/imported-game-workflow-eligibility';
import {
  classifyRating,
  getDefaultRatingNormalizationProfile,
  getRatingRange,
} from '../rating-normalization/rating-normalization.service';

export const PEER_RATING_RESOLVER_POLICY_VERSION = 'dominant-contiguous-window-v1';
export const PEER_RATING_DOMINANT_COVERAGE = 0.7;
export const PEER_RATING_MAX_BANDS = 3;

const GENERIC_FALLBACK_GROUP: LichessGamesRatingGroup = 1400;

const EVIDENCE_SPEEDS_BY_PRESET: Record<
  LichessGamesSpeedPreset,
  readonly LichessGamesPeerEvidenceSpeed[]
> = {
  ALL: ['bullet', 'blitz', 'rapid'],
  BLITZ_AND_SLOWER: ['blitz', 'rapid'],
  BLITZ: ['blitz'],
  BULLET: ['bullet'],
};

export interface PeerRatingEvidence {
  accountId: number;
  provider: LichessGamesPeerEvidenceProvider;
  username: string;
  speed: LichessGamesPeerEvidenceSpeed;
  rating: number;
  games: number;
}

interface PeerRatingEvidenceRepository {
  list(input: {
    userId: number;
    speeds: readonly LichessGamesPeerEvidenceSpeed[];
    from?: Date;
  }): Promise<PeerRatingEvidence[]>;
}

interface PeerRatingBandResolverDependencies {
  repository?: PeerRatingEvidenceRepository;
  clock?: () => Date;
}

export interface PeerRatingBandResolver {
  resolve(userId: number, speedPreset: LichessGamesSpeedPreset): Promise<LichessGamesPeerResolution>;
}

const defaultRepository: PeerRatingEvidenceRepository = {
  async list({ userId, speeds, from }) {
    const grouped = await prisma.importedGame.groupBy({
      by: [
        'accountId',
        'provider',
        'speedCategory',
        'userColor',
        'whiteRating',
        'blackRating',
      ],
      where: {
        userId,
        rated: true,
        endedAt: from ? { gte: from } : { not: null },
        speedCategory: { in: [...speeds] },
        userColor: { in: ['WHITE', 'BLACK'] },
        AND: [
          {
            OR: [
              { variant: null },
              { variant: { in: [...STANDARD_IMPORTED_GAME_VARIANTS] } },
            ],
          },
          {
            OR: [
              { userColor: 'WHITE', whiteRating: { not: null } },
              { userColor: 'BLACK', blackRating: { not: null } },
            ],
          },
        ],
      },
      _count: { _all: true },
    });

    const accountIds = [...new Set(grouped.map((row) => row.accountId))];
    if (accountIds.length === 0) return [];

    const accounts = await prisma.externalAccount.findMany({
      where: { userId, id: { in: accountIds } },
      select: { id: true, provider: true, username: true },
    });
    const accountById = new Map(accounts.map((account) => [account.id, account]));

    return grouped.flatMap((row): PeerRatingEvidence[] => {
      const account = accountById.get(row.accountId);
      const provider = toEvidenceProvider(account?.provider ?? row.provider);
      const speed = toEvidenceSpeed(row.speedCategory);
      const rating = row.userColor === 'WHITE' ? row.whiteRating : row.blackRating;
      if (!account || !provider || !speed || rating === null) return [];
      return [{
        accountId: row.accountId,
        provider,
        username: account.username,
        speed,
        rating,
        games: row._count._all,
      }];
    });
  },
};

export function createPeerRatingBandResolver(
  dependencies: PeerRatingBandResolverDependencies = {},
): PeerRatingBandResolver {
  const repository = dependencies.repository ?? defaultRepository;
  const clock = dependencies.clock ?? (() => new Date());

  return {
    async resolve(userId, speedPreset) {
      const speeds = EVIDENCE_SPEEDS_BY_PRESET[speedPreset];
      const recentEvidence = await repository.list({
        userId,
        speeds,
        from: subtractUtcMonths(clock(), 3),
      });
      if (totalGames(recentEvidence) > 0) {
        return buildPeerResolution(recentEvidence, 'RECENT_THREE_MONTHS');
      }

      const allHistoryEvidence = await repository.list({ userId, speeds });
      if (totalGames(allHistoryEvidence) > 0) {
        return buildPeerResolution(allHistoryEvidence, 'ALL_HISTORY');
      }

      return fallbackResolution();
    },
  };
}

export function buildPeerResolution(
  evidence: readonly PeerRatingEvidence[],
  evidencePeriod: 'RECENT_THREE_MONTHS' | 'ALL_HISTORY',
): LichessGamesPeerResolution {
  const profile = getDefaultRatingNormalizationProfile();
  const groupCounts = new Map<LichessGamesRatingGroup, number>(
    LICHESS_GAMES_RATING_GROUPS.map((group) => [group, 0]),
  );
  const contributionCounts = new Map<string, {
    accountId: number;
    provider: LichessGamesPeerEvidenceProvider;
    username: string;
    speed: LichessGamesPeerEvidenceSpeed;
    games: number;
  }>();

  for (const row of evidence) {
    if (!Number.isInteger(row.games) || row.games <= 0) continue;
    const pool = ratingPool(row.provider, row.speed);
    const grade = classifyRating(pool, row.rating, profile);
    if (!grade) continue;
    const lichessRange = getRatingRange(profile, grade.id, 'LICHESS_BLITZ');
    const parsedGroup = lichessGamesRatingGroupSchema.safeParse(lichessRange?.minInclusive);
    if (!parsedGroup.success) continue;

    groupCounts.set(parsedGroup.data, (groupCounts.get(parsedGroup.data) ?? 0) + row.games);
    const contributionKey = [row.accountId, row.provider, row.speed].join(':');
    const current = contributionCounts.get(contributionKey);
    contributionCounts.set(contributionKey, {
      accountId: row.accountId,
      provider: row.provider,
      username: row.username,
      speed: row.speed,
      games: (current?.games ?? 0) + row.games,
    });
  }

  const distribution = LICHESS_GAMES_RATING_GROUPS.map((group) => ({
    group,
    games: groupCounts.get(group) ?? 0,
  }));
  const eligibleGames = distribution.reduce((total, item) => total + item.games, 0);
  if (eligibleGames === 0) return fallbackResolution();

  return {
    evidencePeriod,
    eligibleGames,
    selectedGroups: selectDominantGroups(distribution.map((item) => item.games)),
    distribution,
    contributions: [...contributionCounts.values()].sort((left, right) => (
      right.games - left.games
      || left.provider.localeCompare(right.provider)
      || left.accountId - right.accountId
      || left.speed.localeCompare(right.speed)
    )),
    normalizationProfile: { id: profile.id, version: profile.version },
    resolverPolicyVersion: PEER_RATING_RESOLVER_POLICY_VERSION,
  };
}

export function selectDominantGroups(counts: readonly number[]): LichessGamesRatingGroup[] {
  if (counts.length !== LICHESS_GAMES_RATING_GROUPS.length) {
    throw new Error('Peer rating distribution must contain every Lichess rating group.');
  }
  const normalizedCounts = counts.map((count) => (
    Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
  ));
  const total = normalizedCounts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return [GENERIC_FALLBACK_GROUP];

  const windows: Array<{ start: number; width: number; games: number }> = [];
  for (let width = 1; width <= PEER_RATING_MAX_BANDS; width += 1) {
    for (let start = 0; start <= normalizedCounts.length - width; start += 1) {
      windows.push({
        start,
        width,
        games: normalizedCounts.slice(start, start + width).reduce((sum, count) => sum + count, 0),
      });
    }
  }

  const target = Math.ceil(total * PEER_RATING_DOMINANT_COVERAGE);
  const qualifying = windows.filter((window) => window.games >= target);
  const selected = (qualifying.length > 0 ? qualifying : windows).sort((left, right) => {
    if (qualifying.length > 0) {
      return left.width - right.width || right.games - left.games || left.start - right.start;
    }
    return right.games - left.games || left.width - right.width || left.start - right.start;
  })[0];

  return LICHESS_GAMES_RATING_GROUPS.slice(selected.start, selected.start + selected.width);
}

function fallbackResolution(): LichessGamesPeerResolution {
  const profile = getDefaultRatingNormalizationProfile();
  return {
    evidencePeriod: 'GENERIC_FALLBACK',
    eligibleGames: 0,
    selectedGroups: [GENERIC_FALLBACK_GROUP],
    distribution: LICHESS_GAMES_RATING_GROUPS.map((group) => ({ group, games: 0 })),
    contributions: [],
    normalizationProfile: { id: profile.id, version: profile.version },
    resolverPolicyVersion: PEER_RATING_RESOLVER_POLICY_VERSION,
  };
}

function ratingPool(
  provider: LichessGamesPeerEvidenceProvider,
  speed: LichessGamesPeerEvidenceSpeed,
): RatingPool {
  const prefix = provider === 'LICHESS' ? 'LICHESS' : 'CHESS_COM';
  return `${prefix}_${speed.toUpperCase()}` as RatingPool;
}

function toEvidenceProvider(value: string | undefined): LichessGamesPeerEvidenceProvider | null {
  return value === 'LICHESS' || value === 'CHESS_COM' ? value : null;
}

function toEvidenceSpeed(value: string | null): LichessGamesPeerEvidenceSpeed | null {
  return value === 'bullet' || value === 'blitz' || value === 'rapid' ? value : null;
}

function totalGames(evidence: readonly PeerRatingEvidence[]): number {
  return evidence.reduce((total, row) => total + Math.max(0, row.games), 0);
}

function subtractUtcMonths(value: Date, months: number): Date {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

export const PeerRatingBandResolver = createPeerRatingBandResolver();