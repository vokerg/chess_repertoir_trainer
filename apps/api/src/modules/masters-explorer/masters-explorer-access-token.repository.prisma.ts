import prisma from '../../prisma';

export interface StoredMastersExplorerAccessToken {
  accessTokenCiphertext: string;
  accessTokenIv: string;
  accessTokenAuthTag: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export function findMastersExplorerAccessTokenForUser(
  userId: number,
): Promise<StoredMastersExplorerAccessToken | null> {
  return prisma.lichessConnection.findUnique({
    where: { userId },
    select: {
      accessTokenCiphertext: true,
      accessTokenIv: true,
      accessTokenAuthTag: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
}
