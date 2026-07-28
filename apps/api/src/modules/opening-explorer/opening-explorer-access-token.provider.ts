import { decryptToken } from '../../services/oauthTokenCrypto';
import { findOpeningExplorerAccessTokenForUser } from './opening-explorer-access-token.repository.prisma';

export interface OpeningExplorerAccessTokenProvider {
  getForUser(userId: number): Promise<string>;
}

export const defaultOpeningExplorerAccessTokenProvider: OpeningExplorerAccessTokenProvider = {
  async getForUser(userId: number): Promise<string> {
    const connection = await findOpeningExplorerAccessTokenForUser(userId);

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
