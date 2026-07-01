import crypto from 'crypto';
import prisma from '../prisma';
import { decryptToken, encryptToken } from './oauthTokenCrypto';

const provider = 'LICHESS';
const oauthBaseUrl = 'https://lichess.org/oauth';
const tokenUrl = 'https://lichess.org/api/token';
const accountUrl = 'https://lichess.org/api/account';
const stateTtlMs = 10 * 60 * 1000;

export class LichessOAuthError extends Error {
  constructor(
    message: string,
    readonly redirectStatus: 'cancelled' | 'error' = 'error',
  ) {
    super(message);
  }
}

interface LichessTokenResponse {
  token_type?: string;
  access_token?: string;
  expires_in?: number;
}

interface LichessAccountResponse {
  id?: string;
  username?: string;
}

export const LichessConnectionService = {
  async getStatusForUser(userId: number) {
    const connection = await prisma.lichessConnection.findUnique({
      where: { userId },
      select: {
        username: true,
        lichessUserId: true,
        externalAccountId: true,
        scopes: true,
        connectedAt: true,
        expiresAt: true,
      },
    });

    if (!connection) return { connected: false };

    return {
      connected: true,
      account: {
        username: connection.username,
        lichessUserId: connection.lichessUserId,
        externalAccountId: connection.externalAccountId,
        scopes: connection.scopes,
        connectedAt: connection.connectedAt.toISOString(),
        expiresAt: connection.expiresAt?.toISOString() ?? null,
      },
    };
  },

  async createAuthorizationUrl(userId: number): Promise<string> {
    await deleteExpiredStates();

    const state = randomUrlSafeString(32);
    const codeVerifier = randomUrlSafeString(64);
    const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());
    const expiresAt = new Date(Date.now() + stateTtlMs);

    await prisma.oAuthLoginState.create({
      data: {
        userId,
        provider,
        state,
        codeVerifier,
        expiresAt,
      },
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: readRequiredEnv('LICHESS_OAUTH_CLIENT_ID'),
      redirect_uri: readRequiredEnv('LICHESS_OAUTH_REDIRECT_URI'),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state,
    });

    const scope = readScopes().join(' ');
    if (scope) params.set('scope', scope);

    return `${oauthBaseUrl}?${params.toString()}`;
  },

  async handleCallback(query: { code?: string; state?: string; error?: string; error_description?: string }): Promise<void> {
    await deleteExpiredStates();

    if (query.error === 'access_denied') {
      throw new LichessOAuthError('Lichess connection cancelled.', 'cancelled');
    }
    if (query.error) {
      throw new LichessOAuthError(query.error_description || 'Lichess OAuth returned an error.');
    }
    if (!query.code || !query.state) {
      throw new LichessOAuthError('Lichess OAuth callback is missing code or state.');
    }

    const loginState = await prisma.oAuthLoginState.findUnique({ where: { state: query.state } });
    if (!loginState || loginState.provider !== provider || loginState.expiresAt <= new Date()) {
      throw new LichessOAuthError('Invalid or expired Lichess OAuth state.');
    }

    const userId = loginState.userId;
    const token = await exchangeCodeForToken(query.code, loginState.codeVerifier);
    const lichessAccount = await fetchLichessAccount(token.accessToken);
    const encrypted = encryptToken(token.accessToken);
    const scopes = readScopes();
    const expiresAt = token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000) : null;

    await prisma.$transaction(async (tx) => {
      const existingByProviderUserId = await tx.externalAccount.findFirst({
        where: { userId, provider, providerUserId: lichessAccount.id },
      });

      const externalAccount = existingByProviderUserId
        ? await tx.externalAccount.update({
            where: { id: existingByProviderUserId.id },
            data: {
              username: lichessAccount.username,
              displayName: existingByProviderUserId.displayName ?? lichessAccount.username,
              isActive: true,
            },
          })
        : await tx.externalAccount.upsert({
            where: {
              userId_provider_username: {
                userId,
                provider,
                username: lichessAccount.username,
              },
            },
            update: {
              providerUserId: lichessAccount.id,
              displayName: lichessAccount.username,
              isActive: true,
            },
            create: {
              userId,
              provider,
              username: lichessAccount.username,
              providerUserId: lichessAccount.id,
              displayName: lichessAccount.username,
              isActive: true,
            },
          });

      await tx.lichessConnection.upsert({
        where: { userId },
        update: {
          externalAccountId: externalAccount.id,
          lichessUserId: lichessAccount.id,
          username: lichessAccount.username,
          scopes,
          accessTokenCiphertext: encrypted.ciphertext,
          accessTokenIv: encrypted.iv,
          accessTokenAuthTag: encrypted.authTag,
          expiresAt,
          revokedAt: null,
          connectedAt: new Date(),
        },
        create: {
          userId,
          externalAccountId: externalAccount.id,
          lichessUserId: lichessAccount.id,
          username: lichessAccount.username,
          scopes,
          accessTokenCiphertext: encrypted.ciphertext,
          accessTokenIv: encrypted.iv,
          accessTokenAuthTag: encrypted.authTag,
          expiresAt,
        },
      });

      await tx.oAuthLoginState.delete({ where: { id: loginState.id } });
    });
  },

  async disconnectForUser(userId: number): Promise<{ disconnected: true }> {
    const connection = await prisma.lichessConnection.findUnique({ where: { userId } });
    if (!connection) return { disconnected: true };

    const token = decryptToken({
      ciphertext: connection.accessTokenCiphertext,
      iv: connection.accessTokenIv,
      authTag: connection.accessTokenAuthTag,
    });

    try {
      await revokeLichessToken(token);
    } catch {
      // Local disconnect should still succeed when the upstream token is already
      // invalid, Lichess is temporarily unavailable, or revoke fails for another
      // non-sensitive reason. The app no longer has a usable local connection
      // after the row is removed below.
    }

    await prisma.lichessConnection.delete({ where: { id: connection.id } });
    return { disconnected: true };
  },
};

async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<{ accessToken: string; expiresIn?: number }> {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: readRequiredEnv('LICHESS_OAUTH_REDIRECT_URI'),
      client_id: readRequiredEnv('LICHESS_OAUTH_CLIENT_ID'),
    }),
  });

  if (!response.ok) {
    throw new LichessOAuthError('Could not exchange Lichess OAuth code for a token.');
  }

  const payload = (await response.json()) as LichessTokenResponse;
  if (!payload.access_token) {
    throw new LichessOAuthError('Lichess token response did not include an access token.');
  }

  return {
    accessToken: payload.access_token,
    expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
  };
}

async function fetchLichessAccount(accessToken: string): Promise<{ id: string; username: string }> {
  const response = await fetch(accountUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new LichessOAuthError('Could not load the connected Lichess account.');
  }

  const payload = (await response.json()) as LichessAccountResponse;
  if (!payload.id || !payload.username) {
    throw new LichessOAuthError('Lichess account response was missing identity fields.');
  }

  return { id: payload.id, username: payload.username };
}

async function revokeLichessToken(accessToken: string): Promise<void> {
  const response = await fetch(tokenUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 401 && response.status !== 403) {
    throw new Error('Could not revoke Lichess OAuth token.');
  }
}

async function deleteExpiredStates(): Promise<void> {
  await prisma.oAuthLoginState.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
}

function randomUrlSafeString(bytes: number): string {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Lichess OAuth.`);
  return value;
}

function readScopes(): string[] {
  return (process.env['LICHESS_OAUTH_SCOPES'] || '')
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}
