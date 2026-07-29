import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

const lichessPuzzleConnectionSelect = {
  scopes: true,
  accessTokenCiphertext: true,
  accessTokenIv: true,
  accessTokenAuthTag: true,
  expiresAt: true,
  revokedAt: true,
} satisfies Prisma.LichessConnectionSelect;

export type LichessPuzzleConnectionRecord = Prisma.LichessConnectionGetPayload<{
  select: typeof lichessPuzzleConnectionSelect;
}>;

export async function findLichessPuzzleConnection(
  userId: number,
): Promise<LichessPuzzleConnectionRecord | null> {
  return prisma.lichessConnection.findUnique({
    where: { userId },
    select: lichessPuzzleConnectionSelect,
  });
}
