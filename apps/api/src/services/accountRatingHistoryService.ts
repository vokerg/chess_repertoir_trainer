import prisma from '../prisma';
import { ExternalProvider } from './externalAccountService';
import {
  STANDARD_IMPORTED_GAME_VARIANTS,
  isStandardImportedGameVariant,
} from '../modules/imported-games/imported-game-workflow-eligibility';

export type RatingSpeed = 'bullet' | 'blitz' | 'rapid';

export interface AccountRatingHistoryQuery {
  from?: string;
  to?: string;
  speeds: RatingSpeed[];
}

export interface AccountRatingHistoryResponse {
  account: {
    id: number;
    provider: ExternalProvider;
    username: string;
    displayName?: string | null;
  };
  bucket: 'day';
  aggregation: 'max';
  ratingSource: 'gameRecordedRating';
  series: Array<{
    key: RatingSpeed;
    label: 'Bullet' | 'Blitz' | 'Rapid';
    points: Array<{
      date: string;
      rating: number;
      gameCount: number;
      ratingAt: string;
    }>;
  }>;
  yDomain: {
    min: number;
    max: number;
  } | null;
}

export type AccountRatingHistoryData = Omit<AccountRatingHistoryResponse, 'account'>;

const SPEED_LABELS: Record<RatingSpeed, 'Bullet' | 'Blitz' | 'Rapid'> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
};

const SPEED_ORDER: readonly RatingSpeed[] = ['bullet', 'blitz', 'rapid'];

export type RatingHistoryGame = {
  endedAt: Date | null;
  speedCategory: string | null;
  variant?: string | null;
  userColor: string | null;
  whiteRating: number | null;
  blackRating: number | null;
};

interface RatingBucket {
  rating: number;
  gameCount: number;
  ratingAt: Date;
}

function getUserRating(game: { userColor: string | null; whiteRating: number | null; blackRating: number | null }) {
  if (game.userColor === 'WHITE') return game.whiteRating;
  if (game.userColor === 'BLACK') return game.blackRating;
  return null;
}

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildEndedAtRange(query: Pick<AccountRatingHistoryQuery, 'from' | 'to'>) {
  if (!query.from && !query.to) return undefined;

  return {
    ...(query.from ? { gte: new Date(query.from) } : {}),
    ...(query.to
      ? /^\d{4}-\d{2}-\d{2}$/.test(query.to)
        ? { lt: new Date(Date.parse(query.to) + 24 * 60 * 60 * 1000) }
        : { lte: new Date(query.to) }
      : {}),
  };
}

export function buildAccountRatingHistoryData(
  games: RatingHistoryGame[],
  speeds: readonly RatingSpeed[],
): AccountRatingHistoryData {
  const requestedSpeeds = new Set<RatingSpeed>(speeds);
  const bucketsBySpeed = new Map<RatingSpeed, Map<string, RatingBucket>>();

  for (const game of games) {
    if (!game.endedAt || !isStandardImportedGameVariant(game.variant)) continue;
    const speed = game.speedCategory?.toLowerCase();
    if (speed !== 'bullet' && speed !== 'blitz' && speed !== 'rapid') continue;
    if (!requestedSpeeds.has(speed)) continue;

    const rating = getUserRating(game);
    if (rating === null) continue;

    const date = utcDayKey(game.endedAt);
    const speedBuckets = bucketsBySpeed.get(speed) ?? new Map<string, RatingBucket>();
    const bucket = speedBuckets.get(date);

    if (!bucket) {
      speedBuckets.set(date, { rating, gameCount: 1, ratingAt: game.endedAt });
    } else {
      bucket.gameCount += 1;
      if (rating > bucket.rating || (rating === bucket.rating && game.endedAt > bucket.ratingAt)) {
        bucket.rating = rating;
        bucket.ratingAt = game.endedAt;
      }
    }

    bucketsBySpeed.set(speed, speedBuckets);
  }

  const ratings: number[] = [];
  const series = SPEED_ORDER.filter((speed) => requestedSpeeds.has(speed)).map((speed) => {
    const buckets = bucketsBySpeed.get(speed) ?? new Map<string, RatingBucket>();
    const points = Array.from(buckets.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, bucket]) => {
        ratings.push(bucket.rating);
        return {
          date,
          rating: bucket.rating,
          gameCount: bucket.gameCount,
          ratingAt: bucket.ratingAt.toISOString(),
        };
      });

    return {
      key: speed,
      label: SPEED_LABELS[speed],
      points,
    };
  });

  const yDomain =
    ratings.length > 0
      ? (() => {
          const rawMin = Math.min(...ratings);
          const rawMax = Math.max(...ratings);
          const padding = Math.max(25, Math.round((rawMax - rawMin) * 0.08));
          return {
            min: Math.max(0, rawMin - padding),
            max: rawMax + padding,
          };
        })()
      : null;

  return {
    bucket: 'day',
    aggregation: 'max',
    ratingSource: 'gameRecordedRating',
    series,
    yDomain,
  };
}

export const AccountRatingHistoryService = {
  getForAccount: async (
    userId: number,
    account: { id: number; provider: string; username: string; displayName?: string | null },
    query: AccountRatingHistoryQuery,
  ): Promise<AccountRatingHistoryResponse> => {
    const games = await prisma.importedGame.findMany({
      where: {
        userId,
        accountId: account.id,
        endedAt: buildEndedAtRange(query),
        userColor: { in: ['WHITE', 'BLACK'] },
        OR: [
          { variant: null },
          { variant: { in: [...STANDARD_IMPORTED_GAME_VARIANTS] } },
        ],
      },
      select: {
        endedAt: true,
        speedCategory: true,
        variant: true,
        userColor: true,
        whiteRating: true,
        blackRating: true,
      },
      orderBy: [{ endedAt: 'asc' }],
    });

    const history = buildAccountRatingHistoryData(games, query.speeds);

    return {
      account: {
        id: account.id,
        provider: account.provider as ExternalProvider,
        username: account.username,
        displayName: account.displayName,
      },
      ...history,
    };
  },
};
