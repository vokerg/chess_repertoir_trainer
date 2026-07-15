import { Prisma } from '@prisma/client';
import type { MastersExplorerSnapshot, MastersExplorerSource } from '@chess-trainer/contracts/masters-explorer';
import prisma from '../../prisma';
import { findOrCreatePositionByNormalizedFen } from '../analysis/analysis.repository.prisma';
import { positionKeyForNormalizedFen } from '../positions/position-key';

const mastersExplorerCacheInclude = {
  position: {
    select: {
      normalizedFen: true,
    },
  },
} as const;

export interface StoredMastersExplorerCache {
  id: number;
  positionId: number;
  normalizedFen: string;
  source: MastersExplorerSource;
  profileVersion: number;
  sinceYear: number;
  untilYear: number;
  movesLimit: number;
  topGamesLimit: number;
  payload: unknown;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface StoreMastersExplorerCacheInput {
  normalizedFen: string;
  source: MastersExplorerSource;
  profileVersion: number;
  sinceYear: number;
  untilYear: number;
  movesLimit: number;
  topGamesLimit: number;
  payload: MastersExplorerSnapshot;
  fetchedAt: Date;
  expiresAt: Date;
}

function mapStoredCache(row: any): StoredMastersExplorerCache {
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

export async function findMastersExplorerCache(
  normalizedFen: string,
  source: MastersExplorerSource,
  profileVersion: number,
): Promise<StoredMastersExplorerCache | null> {
  const positionKey = positionKeyForNormalizedFen(normalizedFen);
  const row = await prisma.mastersExplorerCache.findFirst({
    where: {
      source,
      profileVersion,
      position: { positionKey: new Uint8Array(positionKey) },
    },
    include: mastersExplorerCacheInclude,
  });

  return row ? mapStoredCache(row) : null;
}

export async function upsertMastersExplorerCache(
  input: StoreMastersExplorerCacheInput,
): Promise<StoredMastersExplorerCache> {
  const position = await findOrCreatePositionByNormalizedFen(input.normalizedFen);
  const row = await prisma.mastersExplorerCache.upsert({
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
    include: mastersExplorerCacheInclude,
  });

  return mapStoredCache(row);
}
