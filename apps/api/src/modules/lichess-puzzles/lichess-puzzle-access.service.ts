import { decryptToken } from '../../services/oauthTokenCrypto';
import { findLichessPuzzleConnection } from './lichess-puzzle-access.repository.prisma';

export type LichessPuzzleScope = 'puzzle:read' | 'puzzle:write';

export class LichessPuzzleAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 401 = 400,
    readonly code = 'LICHESS_PUZZLE_ACCESS_UNAVAILABLE',
  ) {
    super(message);
    this.name = 'LichessPuzzleAccessError';
  }
}

export interface LichessPuzzleAccessServiceDependencies {
  findConnection: typeof findLichessPuzzleConnection;
  decrypt: typeof decryptToken;
  now: () => Date;
}

const defaultDependencies: LichessPuzzleAccessServiceDependencies = {
  findConnection: findLichessPuzzleConnection,
  decrypt: decryptToken,
  now: () => new Date(),
};

export function createLichessPuzzleAccessService(
  dependencies: LichessPuzzleAccessServiceDependencies = defaultDependencies,
) {
  return async function getAccessToken(
    userId: number,
    requiredScope: LichessPuzzleScope,
  ): Promise<string> {
    const connection = await dependencies.findConnection(userId);

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

    if (connection.expiresAt && connection.expiresAt <= dependencies.now()) {
      throw new LichessPuzzleAccessError(
        'Your Lichess connection has expired. Reconnect Lichess.',
        400,
        'LICHESS_TOKEN_EXPIRED',
      );
    }

    return dependencies.decrypt({
      ciphertext: connection.accessTokenCiphertext,
      iv: connection.accessTokenIv,
      authTag: connection.accessTokenAuthTag,
    });
  };
}

export const getLichessPuzzleAccessToken = createLichessPuzzleAccessService();
