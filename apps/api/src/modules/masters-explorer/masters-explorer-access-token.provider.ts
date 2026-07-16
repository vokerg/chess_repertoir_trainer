import { decryptToken } from '../../services/oauthTokenCrypto';
import { findMastersExplorerAccessTokenForUser } from './masters-explorer-access-token.repository.prisma';

export interface MastersExplorerAccessTokenProvider {
  getForUser(userId: number): Promise<string>;
}

export const defaultMastersExplorerAccessTokenProvider: MastersExplorerAccessTokenProvider = {
  async getForUser(userId: number): Promise<string> {
    const connection = await findMastersExplorerAccessTokenForUser(userId);

    if (
      !connection
      || connection.revokedAt
      || (connection.expiresAt && connection.expiresAt <= new Date())
    ) {
      throw new Error('The requesting user does not have an active Lichess connection.');
    }

    return decryptToken({
      ciphertext: connection.accessTokenCiphertext,
      iv: connection.accessTokenIv,
      authTag: connection.accessTokenAuthTag,
    });
  },
};
