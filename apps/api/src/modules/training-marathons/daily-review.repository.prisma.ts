import type { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import type { HashedAvailableSublineDto } from '../courses/sublines.service';

export interface ReviewSublineIdentity {
  lineId: number;
  sublineHash: string;
  sublineKeyVersion: number;
}

export function reviewIdentityKey(identity: ReviewSublineIdentity): string {
  return `${identity.lineId}:${identity.sublineKeyVersion}:${identity.sublineHash}`;
}

export async function loadDueReviewIdentityKeys(
  userId: number,
  sublines: HashedAvailableSublineDto[],
  now: Date,
): Promise<Set<string>> {
  const lineIds = [...new Set(sublines.map((subline) => subline.lineId))];
  if (lineIds.length === 0) return new Set();
  const activeKeys = new Set(
    sublines.map((subline) =>
      reviewIdentityKey({
        lineId: subline.lineId,
        sublineHash: subline.hash,
        sublineKeyVersion: subline.canonicalKeyVersion,
      }),
    ),
  );
  const states = await prisma.repertoireSublineReviewState.findMany({
    where: { userId, lineId: { in: lineIds }, dueAt: { lte: now } },
    select: { lineId: true, sublineHash: true, sublineKeyVersion: true },
  });
  return new Set(states.map(reviewIdentityKey).filter((key) => activeKeys.has(key)));
}

export async function findReviewState(
  transaction: Prisma.TransactionClient,
  userId: number,
  identity: ReviewSublineIdentity,
) {
  return transaction.repertoireSublineReviewState.findUnique({
    where: {
      userId_lineId_sublineHash_sublineKeyVersion: { userId, ...identity },
    },
  });
}

export async function seedReviewState(
  transaction: Prisma.TransactionClient,
  userId: number,
  identity: ReviewSublineIdentity,
  dueAt: Date,
): Promise<void> {
  await transaction.repertoireSublineReviewState.upsert({
    where: { userId_lineId_sublineHash_sublineKeyVersion: { userId, ...identity } },
    create: { userId, ...identity, dueAt },
    update: {},
  });
}

export async function updateReviewState(
  transaction: Prisma.TransactionClient,
  userId: number,
  identity: ReviewSublineIdentity,
  data: Prisma.RepertoireSublineReviewStateUncheckedUpdateInput,
): Promise<void> {
  await transaction.repertoireSublineReviewState.update({
    where: { userId_lineId_sublineHash_sublineKeyVersion: { userId, ...identity } },
    data,
  });
}
