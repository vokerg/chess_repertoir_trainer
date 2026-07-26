import prisma from '../../prisma';

export interface StoredOpeningExplorerAccessToken {
  accessTokenCiphertext: string;
  accessTokenIv: string;
  accessTokenAuthTag: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export function findOpeningExplorerAccessTokenForUser(
  userId: number,
): Promise<StoredOpeningExplorerAccessToken | null> {
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
