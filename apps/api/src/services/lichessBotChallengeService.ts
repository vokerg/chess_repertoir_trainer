import { Chess } from 'chess.js';
import prisma from '../prisma';
import { readLichessBotChallengeConfig } from './lichessBotChallengeConfig';
import { decryptToken } from './oauthTokenCrypto';

export type LichessBotChallengeColor = 'white' | 'black' | 'random';

export interface LichessBotChallengeRequest {
  username: string;
  fen: string;
  color?: LichessBotChallengeColor;
  rated?: false;
  clock?: {
    limit: number;
    increment: number;
  };
}

export interface LichessBotChallengeResponse {
  challengeId: string | null;
  url: string | null;
  username: string;
  rawStatus?: string;
}

export class LichessBotChallengeError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

const challengeWriteScope = 'challenge:write';
const challengeBaseUrl = 'https://lichess.org/api/challenge';

export const LichessBotChallengeService = {
  getOptions() {
    return readLichessBotChallengeConfig();
  },

  async challengeBot(
    userId: number,
    input: LichessBotChallengeRequest,
  ): Promise<LichessBotChallengeResponse> {
    const username = validateUsername(input.username);
    const color = validateColor(input.color);
    validateRated(input.rated);
    validateFen(input.fen);
    validateClock(input.clock);

    const connection = await prisma.lichessConnection.findUnique({
      where: { userId },
      select: {
        scopes: true,
        accessTokenCiphertext: true,
        accessTokenIv: true,
        accessTokenAuthTag: true,
      },
    });

    if (!connection) {
      throw new LichessBotChallengeError(
        'No Lichess connection found. Connect Lichess before challenging a bot.',
      );
    }

    if (!connection.scopes.includes(challengeWriteScope)) {
      throw new LichessBotChallengeError(
        'Your Lichess connection is missing challenge:write. Reconnect Lichess with the updated OAuth scopes.',
      );
    }

    const token = decryptToken({
      ciphertext: connection.accessTokenCiphertext,
      iv: connection.accessTokenIv,
      authTag: connection.accessTokenAuthTag,
    });

    const body = new URLSearchParams({
      rated: 'false',
      color,
      fen: input.fen,
    });

    if (input.clock) {
      body.set('clock.limit', String(input.clock.limit));
      body.set('clock.increment', String(input.clock.increment));
    }

    const response = await fetch(`${challengeBaseUrl}/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const payload = await readJsonPayload(response);
    if (!response.ok) {
      throw new LichessBotChallengeError(readLichessError(payload));
    }

    return toSafeChallengeResponse(username, payload);
  },
};

function validateUsername(username: string): string {
  if (typeof username !== 'string' || !username.trim()) {
    throw new LichessBotChallengeError('Choose a configured Lichess bot.');
  }

  const trimmed = username.trim();
  const config = readLichessBotChallengeConfig();
  if (!config.bots.some((bot) => bot.username === trimmed)) {
    throw new LichessBotChallengeError('That Lichess bot is not configured for challenges.');
  }

  return trimmed;
}

function validateColor(color: LichessBotChallengeColor | undefined): LichessBotChallengeColor {
  const value = color ?? 'white';
  if (value !== 'white' && value !== 'black' && value !== 'random') {
    throw new LichessBotChallengeError('Challenge color must be white, black, or random.');
  }
  return value;
}

function validateRated(rated: false | undefined): void {
  if (rated !== undefined && rated !== false) {
    throw new LichessBotChallengeError('Rated Lichess bot challenges are not supported yet.');
  }
}

function validateFen(fen: string): void {
  if (typeof fen !== 'string' || !fen.trim()) {
    throw new LichessBotChallengeError('A valid FEN is required to challenge a bot.');
  }

  try {
    new Chess(fen);
  } catch {
    throw new LichessBotChallengeError('The current position is not a valid FEN.');
  }
}

function validateClock(clock: LichessBotChallengeRequest['clock']): void {
  if (!clock) return;
  if (
    !Number.isInteger(clock.limit) ||
    !Number.isInteger(clock.increment) ||
    clock.limit <= 0 ||
    clock.increment < 0
  ) {
    throw new LichessBotChallengeError('Clock must include a positive limit and non-negative increment.');
  }
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readLichessError(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const error = record['error'] ?? record['message'];
    if (typeof error === 'string' && error.trim()) return `Lichess rejected the challenge: ${error}`;
  }

  return 'Lichess rejected the challenge.';
}

function toSafeChallengeResponse(username: string, payload: unknown): LichessBotChallengeResponse {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const challenge =
    record['challenge'] && typeof record['challenge'] === 'object'
      ? (record['challenge'] as Record<string, unknown>)
      : record;

  const challengeId = typeof challenge['id'] === 'string' ? challenge['id'] : null;
  const url =
    typeof challenge['url'] === 'string'
      ? challenge['url']
      : challengeId
        ? `https://lichess.org/${challengeId}`
        : null;
  const rawStatus = typeof challenge['status'] === 'string' ? challenge['status'] : undefined;

  return {
    challengeId,
    url,
    username,
    ...(rawStatus ? { rawStatus } : {}),
  };
}
