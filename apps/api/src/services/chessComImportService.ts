import prisma from '../prisma';

const CHESS_COM_API_BASE_URL = 'https://api.chess.com/pub/player';
const MONTH_OVERLAP_MS = 31 * 24 * 60 * 60 * 1000;
const CHESS_COM_USER_AGENT = process.env['CHESS_COM_USER_AGENT'] || 'chess-repertoire-trainer/0.1 (+https://github.com/vokerg/chess_repertoir_trainer)';

type ChessComArchivesResponse = {
  archives?: string[];
};

type ChessComMonthlyGamesResponse = {
  games?: ChessComGame[];
};

type ChessComGame = {
  url?: string;
  uuid?: string;
  pgn?: string;
  time_control?: string;
  end_time?: number;
  start_time?: number;
  rated?: boolean;
  fen?: string;
  time_class?: string;
  rules?: string;
  eco?: string;
  white?: ChessComPlayer;
  black?: ChessComPlayer;
};

type ChessComPlayer = {
  username?: string;
  rating?: number;
  result?: string;
  '@id'?: string;
};

type ParsedTimeControl = {
  raw: string | null;
  initial: number | null;
  increment: number | null;
};

type ArchiveMonth = {
  url: string;
  year: number;
  month: number;
};

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

function normalizeChessComName(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function getPgnHeader(pgn: string | undefined, header: string) {
  if (!pgn) return null;
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = pgn.match(new RegExp(`\\[${escaped}\\s+"([^"]*)"\\]`));
  return match?.[1] ?? null;
}

function parsePgnDateTime(dateValue: string | null, timeValue: string | null) {
  if (!dateValue || !/^\d{4}\.\d{2}\.\d{2}$/.test(dateValue)) return null;
  const datePart = dateValue.replace(/\./g, '-');
  const timePart = timeValue && /^\d{2}:\d{2}:\d{2}$/.test(timeValue) ? timeValue : '00:00:00';
  const parsed = new Date(`${datePart}T${timePart}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timestampSecondsToDate(value?: number) {
  return typeof value === 'number' ? new Date(value * 1000) : null;
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

function getTimeControl(game: ChessComGame): ParsedTimeControl {
  return parseTimeControlRaw(game.time_control ?? getPgnHeader(game.pgn, 'TimeControl'));
}

function parseRating(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getUserColor(game: ChessComGame, accountUsername: string): 'WHITE' | 'BLACK' | null {
  const account = normalizeChessComName(accountUsername);
  const white = normalizeChessComName(game.white?.username ?? getPgnHeader(game.pgn, 'White'));
  const black = normalizeChessComName(game.black?.username ?? getPgnHeader(game.pgn, 'Black'));

  if (account && white === account) return 'WHITE';
  if (account && black === account) return 'BLACK';
  return null;
}

function getResult(game: ChessComGame) {
  const whiteResult = game.white?.result;
  const blackResult = game.black?.result;

  if (whiteResult === 'win') return '1-0';
  if (blackResult === 'win') return '0-1';
  if ((whiteResult && DRAW_RESULTS.has(whiteResult)) || (blackResult && DRAW_RESULTS.has(blackResult))) {
    return '1/2-1/2';
  }

  return getPgnHeader(game.pgn, 'Result') ?? '*';
}

function getResultForUser(game: ChessComGame, userColor: 'WHITE' | 'BLACK' | null) {
  if (!userColor) return null;
  const ownResult = userColor === 'WHITE' ? game.white?.result : game.black?.result;
  if (!ownResult) return null;
  if (ownResult === 'win') return 'WIN';
  if (DRAW_RESULTS.has(ownResult)) return 'DRAW';
  return 'LOSS';
}

function getStatus(game: ChessComGame) {
  const termination = getPgnHeader(game.pgn, 'Termination');
  if (termination) return termination;
  const whiteResult = game.white?.result;
  const blackResult = game.black?.result;
  return whiteResult || blackResult ? `${whiteResult ?? 'unknown'}/${blackResult ?? 'unknown'}` : null;
}

function getStartedAt(game: ChessComGame) {
  return timestampSecondsToDate(game.start_time)
    ?? parsePgnDateTime(getPgnHeader(game.pgn, 'UTCDate'), getPgnHeader(game.pgn, 'UTCTime'))
    ?? parsePgnDateTime(getPgnHeader(game.pgn, 'Date'), null);
}

function getEndedAt(game: ChessComGame) {
  return timestampSecondsToDate(game.end_time)
    ?? parsePgnDateTime(getPgnHeader(game.pgn, 'EndDate'), getPgnHeader(game.pgn, 'EndTime'))
    ?? getStartedAt(game);
}

function buildChessComGameUrl(game: ChessComGame) {
  return game.url ?? getPgnHeader(game.pgn, 'Link') ?? getPgnHeader(game.pgn, 'Site');
}

function getProviderGameId(game: ChessComGame) {
  const providerGameId = game.uuid ?? game.url ?? getPgnHeader(game.pgn, 'Link') ?? getPgnHeader(game.pgn, 'Site');
  if (!providerGameId) throw new Error('Chess.com game has no stable id or URL');
  return providerGameId;
}

function normalizeGame(game: ChessComGame, account: { id: number; userId: number; username: string; provider: string }) {
  const timeControl = getTimeControl(game);
  const userColor = getUserColor(game, account.username);
  const whiteUsername = game.white?.username ?? getPgnHeader(game.pgn, 'White');
  const blackUsername = game.black?.username ?? getPgnHeader(game.pgn, 'Black');
  const opponentUsername = userColor === 'WHITE' ? blackUsername : userColor === 'BLACK' ? whiteUsername : null;

  return {
    userId: account.userId,
    accountId: account.id,
    provider: account.provider,
    providerGameId: getProviderGameId(game),
    providerUrl: buildChessComGameUrl(game),
    pgn: game.pgn ?? null,
    rated: game.rated ?? null,
    variant: game.rules ?? getPgnHeader(game.pgn, 'Variant'),
    speedCategory: game.time_class ?? null,
    timeControlRaw: timeControl.raw,
    timeControlInitial: timeControl.initial,
    timeControlIncrement: timeControl.increment,
    startedAt: getStartedAt(game),
    endedAt: getEndedAt(game),
    whiteUsername,
    blackUsername,
    whiteRating: game.white?.rating ?? parseRating(getPgnHeader(game.pgn, 'WhiteElo')),
    blackRating: game.black?.rating ?? parseRating(getPgnHeader(game.pgn, 'BlackElo')),
    userColor,
    opponentUsername,
    result: getResult(game),
    resultForUser: getResultForUser(game, userColor),
    status: getStatus(game),
    openingName: getPgnHeader(game.pgn, 'Opening'),
    openingEco: getPgnHeader(game.pgn, 'ECO'),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': CHESS_COM_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Chess.com returned ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function parseArchiveMonth(url: string): ArchiveMonth | null {
  const match = url.match(/\/games\/(\d{4})\/(\d{2})\/?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { url, year, month };
}

function monthEndDate(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

function shouldFetchArchive(archive: ArchiveMonth, syncSince: Date | null) {
  if (!syncSince) return true;
  return monthEndDate(archive.year, archive.month) >= syncSince;
}

function buildSince(cursor?: Date | null) {
  if (!cursor) return null;
  return new Date(Math.max(0, cursor.getTime() - MONTH_OVERLAP_MS));
}

function buildArchivesUrl(username: string) {
  return `${CHESS_COM_API_BASE_URL}/${encodeURIComponent(username.toLowerCase())}/games/archives`;
}

export const ChessComImportService = {
  syncAccount: async (userId: number, accountId: number) => {
    const account = await prisma.externalAccount.findFirst({
      where: { id: accountId, userId, provider: 'CHESS_COM', isActive: true },
    });

    if (!account) throw new Error('Active Chess.com account not found');

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
      const archivesResponse = await fetchJson<ChessComArchivesResponse>(buildArchivesUrl(account.username));
      const archives = (archivesResponse.archives ?? [])
        .map(parseArchiveMonth)
        .filter((archive): archive is ArchiveMonth => archive !== null)
        .filter((archive) => shouldFetchArchive(archive, syncSince));

      for (const archive of archives) {
        const monthlyGames = await fetchJson<ChessComMonthlyGamesResponse>(archive.url);

        for (const game of monthlyGames.games ?? []) {
          gamesSeen += 1;
          try {
            const data = normalizeGame(game, account);
            if (syncSince && data.endedAt && data.endedAt < syncSince) {
              gamesSkipped += 1;
              continue;
            }

            const existing = await prisma.importedGame.findUnique({
              where: {
                accountId_providerGameId: {
                  accountId: account.id,
                  providerGameId: data.providerGameId,
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
          } catch {
            gamesFailed += 1;
          }
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
        archivesFetched: archives.length,
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
