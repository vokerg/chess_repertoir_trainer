import { Prisma } from '@prisma/client';
import type {
  OpeningExplorerSnapshot,
  OpeningExplorerSource,
} from '@chess-trainer/contracts/opening-explorer';
import prisma from '../../prisma';
import { findOrCreatePositionByNormalizedFen } from '../analysis/analysis.repository.prisma';
import { positionKeyForNormalizedFen } from '../positions/position-key';

const openingExplorerCacheInclude = {
  position: {
    select: {
      normalizedFen: true,
    },
  },
} as const;

export interface StoredOpeningExplorerCache {
  id: number;
  positionId: number;
  normalizedFen: string;
  source: OpeningExplorerSource;
  profileVersion: number;
  sinceYear: number;
  untilYear: number;
  movesLimit: number;
  topGamesLimit: number;
  payload: unknown;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface StoreOpeningExplorerCacheInput {
  normalizedFen: string;
  source: OpeningExplorerSource;
  profileVersion: number;
  sinceYear: number;
  untilYear: number;
  movesLimit: number;
  topGamesLimit: number;
  payload: OpeningExplorerSnapshot;
  fetchedAt: Date;
  expiresAt: Date;
}

function mapStoredCache(row: any): StoredOpeningExplorerCache {
  return {
    id: row.id,
    positionId: row.positionId,
    normalizedFen: row.position.normalizedFen,
    source: row.source,
    profileVersion: row.profileVersion,
    sinceYear: row.sinceYear,
    untilYear: row.untilYear,
    movesLimit: row.movesLimit,
    topGamesLimit: row.topGamesLimit,
    payload: row.payload,
    fetchedAt: row.fetchedAt,
    expiresAt: row.expiresAt,
  };
}

export async function findOpeningExplorerCache(
  normalizedFen: string,
  source: OpeningExplorerSource,
  profileVersion: number,
): Promise<StoredOpeningExplorerCache | null> {
  const positionKey = positionKeyForNormalizedFen(normalizedFen);
  const row = await prisma.openingExplorerCache.findFirst({
    where: {
      source,
      profileVersion,
      position: { positionKey: new Uint8Array(positionKey) },
    },
    include: openingExplorerCacheInclude,
  });

  return row ? mapStoredCache(row) : null;
}

export async function upsertOpeningExplorerCache(
  input: StoreOpeningExplorerCacheInput,
): Promise<StoredOpeningExplorerCache> {
  const position = await findOrCreatePositionByNormalizedFen(input.normalizedFen);
  const row = await prisma.openingExplorerCache.upsert({
    where: {
      positionId_source_profileVersion: {
        positionId: position.id,
        source: input.source,
        profileVersion: input.profileVersion,
      },
    },
    create: {
      positionId: position.id,
      source: input.source,
      profileVersion: input.profileVersion,
      sinceYear: input.sinceYear,
      untilYear: input.untilYear,
      movesLimit: input.movesLimit,
      topGamesLimit: input.topGamesLimit,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      fetchedAt: input.fetchedAt,
      expiresAt: input.expiresAt,
    },
    update: {
      sinceYear: input.sinceYear,
      untilYear: input.untilYear,
      movesLimit: input.movesLimit,
      topGamesLimit: input.topGamesLimit,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      fetchedAt: input.fetchedAt,
      expiresAt: input.expiresAt,
    },
    include: openingExplorerCacheInclude,
  });

  return mapStoredCache(row);
}
