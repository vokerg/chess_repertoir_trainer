import prisma from '../prisma';
import { SINGLETON_USER_ID } from './currentUserService';

const LICHESS_GAMES_URL = 'https://lichess.org/api/games/user';
const OVERLAP_MS = 24 * 60 * 60 * 1000;

type LichessGame = {
  id: string;
  rated?: boolean;
  variant?: string;
  speed?: string;
  perf?: string;
  createdAt?: number;
  lastMoveAt?: number;
  status?: string;
  winner?: 'white' | 'black';
  url?: string;
  pgn?: string;
  moves?: string;
  clock?: {
    initial?: number;
    increment?: number;
    totalTime?: number;
  };
  clocks?: number[];
  players?: {
    white?: LichessPlayer;
    black?: LichessPlayer;
  };
  opening?: {
    eco?: string;
    name?: string;
    ply?: number;
  };
};

type LichessPlayer = {
  user?: {
    id?: string;
    name?: string;
    title?: string;
  };
  rating?: number;
  ratingDiff?: number;
  aiLevel?: number;
};

type ParsedTimeControl = {
  raw: string | null;
  initial: number | null;
  increment: number | null;
};

function toDate(value?: number) {
  return typeof value === 'number' ? new Date(value) : null;
}

function playerName(player?: LichessPlayer) {
  return player?.user?.name ?? (player?.aiLevel ? `Stockfish level ${player.aiLevel}` : null);
}

function normalizeLichessName(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function getPgnHeader(pgn: string | undefined, header: string) {
  if (!pgn) return null;
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = pgn.match(new RegExp(`\\[${escaped}\\s+"([^"]*)"\\]`));
  return match?.[1] ?? null;
}

function parseTimeControlRaw(raw: string | null): ParsedTimeControl {
  if (!raw || raw === '-' || raw === '?') {
    return { raw, initial: null, increment: null };
  }

  const match = raw.match(/^(\d+)(?:\+(\d+))?$/);
  if (!match) {
    return { raw, initial: null, increment: null };
  }

  return {
    raw,
    initial: Number(match[1]),
    increment: match[2] ? Number(match[2]) : 0,
  };
}

function getTimeControl(game: LichessGame): ParsedTimeControl {
  if (game.clock) {
    const initial = game.clock.initial ?? 0;
    const increment = game.clock.increment ?? 0;
    return { raw: `${initial}+${increment}`, initial, increment };
  }

  return parseTimeControlRaw(getPgnHeader(game.pgn, 'TimeControl'));
}

function getUserColor(game: LichessGame, accountUsername: string): 'WHITE' | 'BLACK' | null {
  const account = normalizeLichessName(accountUsername);
  const white = normalizeLichessName(playerName(game.players?.white) ?? getPgnHeader(game.pgn, 'White'));
  const black = normalizeLichessName(playerName(game.players?.black) ?? getPgnHeader(game.pgn, 'Black'));

  if (account && white === account) return 'WHITE';
  if (account && black === account) return 'BLACK';
  return null;
}

function getResultForUser(game: LichessGame, userColor: 'WHITE' | 'BLACK' | null) {
  if (!userColor) return null;
  if (game.status === 'draw' || game.status === 'stalemate') return 'DRAW';
  if (!game.winner) return null;
  return game.winner.toUpperCase() === userColor ? 'WIN' : 'LOSS';
}

function getResult(game: LichessGame) {
  if (game.winner === 'white') return '1-0';
  if (game.winner === 'black') return '0-1';
  if (game.status === 'draw' || game.status === 'stalemate') return '1/2-1/2';
  return getPgnHeader(game.pgn, 'Result') ?? '*';
}

function buildLichessUrl(gameId: string) {
  return `https://lichess.org/${gameId}`;
}

function parseRating(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGame(game: LichessGame, account: { id: number; userId: number; username: string; provider: string }) {
  const timeControl = getTimeControl(game);
  const userColor = getUserColor(game, account.username);
  const whiteUsername = playerName(game.players?.white) ?? getPgnHeader(game.pgn, 'White');
  const blackUsername = playerName(game.players?.black) ?? getPgnHeader(game.pgn, 'Black');
  const opponentUsername = userColor === 'WHITE' ? blackUsername : userColor === 'BLACK' ? whiteUsername : null;

  return {
    userId: account.userId,
    accountId: account.id,
    provider: account.provider,
    providerGameId: game.id,
    providerUrl: game.url ?? getPgnHeader(game.pgn, 'Site') ?? buildLichessUrl(game.id),
    pgn: game.pgn ?? null,
    rated: game.rated ?? null,
    variant: game.variant ?? getPgnHeader(game.pgn, 'Variant'),
    speedCategory: game.speed ?? game.perf ?? null,
    timeControlRaw: timeControl.raw,
    timeControlInitial: timeControl.initial,
    timeControlIncrement: timeControl.increment,
    startedAt: toDate(game.createdAt),
    endedAt: toDate(game.lastMoveAt ?? game.createdAt),
    whiteUsername,
    blackUsername,
    whiteRating: game.players?.white?.rating ?? parseRating(getPgnHeader(game.pgn, 'WhiteElo')),
    blackRating: game.players?.black?.rating ?? parseRating(getPgnHeader(game.pgn, 'BlackElo')),
    userColor,
    opponentUsername,
    result: getResult(game),
    resultForUser: getResultForUser(game, userColor),
    status: game.status ?? getPgnHeader(game.pgn, 'Termination'),
    openingName: game.opening?.name ?? getPgnHeader(game.pgn, 'Opening'),
    openingEco: game.opening?.eco ?? getPgnHeader(game.pgn, 'ECO'),
  };
}

async function* readNdjson(response: Response): AsyncGenerator<LichessGame> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      yield JSON.parse(trimmed);
    }
  }

  buffer += decoder.decode();
  const trimmed = buffer.trim();
  if (trimmed) yield JSON.parse(trimmed);
}

function buildSince(cursor?: Date | null) {
  if (!cursor) return null;
  return new Date(Math.max(0, cursor.getTime() - OVERLAP_MS));
}

export const LichessImportService = {
  syncAccount: async (accountId: number) => {
    const account = await prisma.externalAccount.findFirst({
      where: { id: accountId, userId: SINGLETON_USER_ID, provider: 'LICHESS', isActive: true },
    });

    if (!account) throw new Error('Active Lichess account not found');

    const syncSince = buildSince(account.syncCursorTime);
    const importRun = await prisma.importRun.create({
      data: {
        userId: account.userId,
        accountId: account.id,
        provider: account.provider,
        status: 'RUNNING',
        syncSince,
      },
    });

    let gamesSeen = 0;
    let gamesImported = 0;
    let gamesSkipped = 0;
    let gamesFailed = 0;
    let maxEndedAt = account.syncCursorTime ?? null;

    try {
      const url = new URL(`${LICHESS_GAMES_URL}/${encodeURIComponent(account.username)}`);
      url.searchParams.set('finished', 'true');
      url.searchParams.set('sort', 'dateAsc');
      url.searchParams.set('pgnInJson', 'true');
      url.searchParams.set('opening', 'true');
      if (syncSince) url.searchParams.set('since', String(syncSince.getTime()));

      const response = await fetch(url, {
        headers: {
          Accept: 'application/x-ndjson',
        },
      });

      if (!response.ok) {
        throw new Error(`Lichess returned ${response.status} ${response.statusText}`);
      }

      for await (const game of readNdjson(response)) {
        gamesSeen += 1;
        try {
          const data = normalizeGame(game, account);
          const existing = await prisma.importedGame.findUnique({
            where: {
              accountId_providerGameId: {
                accountId: account.id,
                providerGameId: game.id,
              },
            },
            select: { id: true },
          });

          if (existing) {
            gamesSkipped += 1;
          } else {
            await prisma.importedGame.create({ data });
            gamesImported += 1;
          }

          if (data.endedAt && (!maxEndedAt || data.endedAt > maxEndedAt)) {
            maxEndedAt = data.endedAt;
          }
        } catch (err) {
          gamesFailed += 1;
        }
      }

      const completedAt = new Date();
      await prisma.$transaction([
        prisma.importRun.update({
          where: { id: importRun.id },
          data: {
            status: 'COMPLETED',
            gamesSeen,
            gamesImported,
            gamesUpdated: 0,
            gamesSkipped,
            gamesFailed,
            completedAt,
            syncUntil: maxEndedAt,
          },
        }),
        prisma.externalAccount.update({
          where: { id: account.id },
          data: {
            lastSyncAt: completedAt,
            syncCursorTime: maxEndedAt,
            lastSyncRunId: importRun.id,
          },
        }),
      ]);

      return {
        importRunId: importRun.id,
        status: 'COMPLETED',
        gamesSeen,
        gamesImported,
        gamesUpdated: 0,
        gamesSkipped,
        gamesFailed,
        syncSince,
        syncUntil: maxEndedAt,
      };
    } catch (err: any) {
      await prisma.importRun.update({
        where: { id: importRun.id },
        data: {
          status: 'FAILED',
          gamesSeen,
          gamesImported,
          gamesUpdated: 0,
          gamesSkipped,
          gamesFailed,
          error: err.message ?? String(err),
          completedAt: new Date(),
          syncUntil: maxEndedAt,
        },
      });
      throw err;
    }
  },
};
