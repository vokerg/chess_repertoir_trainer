import prisma from '../../prisma';
import { decryptToken } from '../../services/oauthTokenCrypto';

export type LichessPuzzleScope = 'puzzle:read' | 'puzzle:write';

export class LichessPuzzleAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 = 400,
    readonly code = 'LICHESS_PUZZLE_ACCESS_UNAVAILABLE',
  ) {
    super(message);
  }
}

export async function getLichessPuzzleAccessToken(
  userId: number,
  requiredScope: LichessPuzzleScope,
): Promise<string> {
  const connection = await prisma.lichessConnection.findUnique({
    where: { userId },
    select: {
      scopes: true,
      accessTokenCiphertext: true,
      accessTokenIv: true,
      accessTokenAuthTag: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!connection || connection.revokedAt) {
    throw new LichessPuzzleAccessError(
      'Connect Lichess before using Lichess puzzles.',
      400,
      'LICHESS_NOT_CONNECTED',
    );
  }

  if (!connection.scopes.includes(requiredScope)) {
    throw new LichessPuzzleAccessError(
      `Your Lichess connection is missing ${requiredScope}. Reconnect Lichess with the updated OAuth scopes.`,
      400,
      'LICHESS_SCOPE_MISSING',
    );
  }

  if (connection.expiresAt && connection.expiresAt <= new Date()) {
    throw new LichessPuzzleAccessError(
      'Your Lichess connection has expired. Reconnect Lichess.',
      400,
      'LICHESS_TOKEN_EXPIRED',
    );
  }

  return decryptToken({
    ciphertext: connection.accessTokenCiphertext,
    iv: connection.accessTokenIv,
    authTag: connection.accessTokenAuthTag,
  });
}
