import type { AccountImportMode, AccountImportScope } from '@chess-trainer/contracts';
import {
  isStandardImportedGameVariant,
  normalizeImportedGameVariant,
} from '../../../imported-games/imported-game-workflow-eligibility';
import type { NormalizedAccountImportGame } from '../../account-import.types';

const CHESS_COM_API_BASE_URL = 'https://api.chess.com/pub/player';
const DEFAULT_FETCH_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_RATE_LIMIT_DELAY_MS = 60_000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000;
const DEFAULT_CACHE_MAX_ENTRIES = 64;
const DEFAULT_USER_AGENT = process.env['CHESS_COM_USER_AGENT']
  || 'chess-repertoire-trainer/0.1 (+https://github.com/vokerg/chess_repertoir_trainer)';

const RETRYABLE_CHESS_COM_STATUSES = new Set([408, 500, 502, 503, 504]);
const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

export interface ChessComArchivesResponse {
  archives?: string[];
}

export interface ChessComMonthlyGamesResponse {
  games?: ChessComGame[];
}

export interface ChessComGame {
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
}

export interface ChessComPlayer {
  username?: string;
  rating?: number;
  result?: string;
  '@id'?: string;
}

interface ParsedTimeControl {
  raw: string | null;
  initial: number | null;
  increment: number | null;
}

export interface ChessComArchiveMonth {
  key: string;
  year: number;
  month: number;
}

export interface ChessComImportWindow extends ChessComArchiveMonth {
  from: Date;
  to: Date;
  url: string;
}

export interface ChessComCachedJsonResponse {
  etag: string | null;
  lastModified: string | null;
  value: WeakRef<object>;
}

export interface ChessComPubApiClient {
  fetchArchives(username: string, signal?: AbortSignal): Promise<ChessComArchivesResponse>;
  fetchMonthlyArchive(
    username: string,
    year: number,
    month: number,
    signal?: AbortSignal,
  ): Promise<ChessComMonthlyGamesResponse>;
}

export interface ChessComPubApiClientOptions {
  fetchImpl?: typeof fetch;
  retries?: number;
  retryBaseDelayMs?: number;
  rateLimitDelayMs?: number;
  maxRetryDelayMs?: number;
  cacheMaxEntries?: number;
  userAgent?: string;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  cache?: Map<string, ChessComCachedJsonResponse>;
}

export class ChessComHttpError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
  ) {
    super(`Chess.com request failed with HTTP ${status}${statusText ? ` ${statusText}` : ''}.`);
    this.name = 'ChessComHttpError';
  }
}

export class ChessComRateLimitError extends ChessComHttpError {
  constructor(readonly retryAt: Date, statusText: string) {
    super(429, statusText);
    this.name = 'ChessComRateLimitError';
  }
}

export function buildChessComArchivesUrl(username: string): string {
  return `${CHESS_COM_API_BASE_URL}/${encodeURIComponent(username.toLowerCase())}/games/archives`;
}

export function buildChessComMonthlyArchiveUrl(
  username: string,
  year: number,
  month: number,
): string {
  const paddedMonth = String(month).padStart(2, '0');
  return `${CHESS_COM_API_BASE_URL}/${encodeURIComponent(username.toLowerCase())}/games/${year}/${paddedMonth}`;
}

export function parseChessComArchiveMonth(url: string): ChessComArchiveMonth | null {
  const match = url.match(/\/games\/(\d{4})\/(\d{2})\/?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { key: archiveMonthKey(year, month), year, month };
}

export function archiveMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function planChessComImportWindows(input: {
  username: string;
  mode: AccountImportMode;
  requestedFrom: Date;
  requestedTo: Date;
}): ChessComImportWindow[] {
  assertValidRange(input.requestedFrom, input.requestedTo);
  if (input.mode === 'LEGACY_SYNC') {
    throw new Error('Legacy account imports do not use durable Chess.com windows.');
  }

  const windows: ChessComImportWindow[] = [];
  let cursor = new Date(Date.UTC(
    input.requestedFrom.getUTCFullYear(),
    input.requestedFrom.getUTCMonth(),
    1,
  ));

  while (cursor < input.requestedTo) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    windows.push({
      key: archiveMonthKey(year, month),
      year,
      month,
      from: new Date(Math.max(cursor.getTime(), input.requestedFrom.getTime())),
      to: new Date(Math.min(next.getTime(), input.requestedTo.getTime())),
      url: buildChessComMonthlyArchiveUrl(input.username, year, month),
    });
    cursor = next;
  }

  if (input.mode === 'INCREMENTAL_FORWARD') return windows;
  return windows.reverse();
}

export function normalizeChessComGame(
  game: ChessComGame,
  account: { id: number; userId: number; username: string; provider: string },
): NormalizedAccountImportGame {
  const timeControl = getTimeControl(game);
  const userColor = getUserColor(game, account.username);
  const whiteUsername = game.white?.username ?? getPgnHeader(game.pgn, 'White');
  const blackUsername = game.black?.username ?? getPgnHeader(game.pgn, 'Black');
  const opponentUsername = userColor === 'WHITE'
    ? blackUsername
    : userColor === 'BLACK'
      ? whiteUsername
      : null;

  return {
    providerGameId: getProviderGameId(game),
    providerUrl: game.url ?? getPgnHeader(game.pgn, 'Link') ?? getPgnHeader(game.pgn, 'Site'),
    pgn: game.pgn ?? null,
    rated: game.rated ?? null,
    variant: normalizeImportedGameVariant(game.rules ?? getPgnHeader(game.pgn, 'Variant')),
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

export function chessComGameMatchesImportScope(
  game: NormalizedAccountImportGame,
  scope: AccountImportScope,
  from: Date,
  to: Date,
): boolean {
  const endedAt = game.endedAt;
  if (!(endedAt instanceof Date) || !Number.isFinite(endedAt.getTime())) {
    throw new Error('Chess.com game is missing a valid end timestamp.');
  }
  if (endedAt < from || endedAt >= to) return false;
  if (!isStandardImportedGameVariant(game.variant)) return false;

  const speed = game.speedCategory?.trim().toUpperCase() ?? '';
  if (!scope.speeds.includes(speed as AccountImportScope['speeds'][number])) return false;

  if (scope.rated === 'RATED') return game.rated === true;
  if (scope.rated === 'UNRATED') return game.rated === false;
  return true;
}

export function parseRetryAfterMs(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - now);
}

export function createChessComPubApiClient(
  options: ChessComPubApiClientOptions = {},
): ChessComPubApiClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = resolveNonNegativeInteger(options.retries, DEFAULT_FETCH_RETRIES, 'retries');
  const retryBaseDelayMs = resolveNonNegativeInteger(
    options.retryBaseDelayMs,
    DEFAULT_RETRY_BASE_DELAY_MS,
    'retryBaseDelayMs',
  );
  const rateLimitDelayMs = resolveNonNegativeInteger(
    options.rateLimitDelayMs,
    DEFAULT_RATE_LIMIT_DELAY_MS,
    'rateLimitDelayMs',
  );
  const maxRetryDelayMs = resolveNonNegativeInteger(
    options.maxRetryDelayMs,
    DEFAULT_MAX_RETRY_DELAY_MS,
    'maxRetryDelayMs',
  );
  const cacheMaxEntries = resolvePositiveInteger(
    options.cacheMaxEntries,
    DEFAULT_CACHE_MAX_ENTRIES,
    'cacheMaxEntries',
  );
  const userAgent = options.userAgent?.trim() || DEFAULT_USER_AGENT;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? abortableSleep;
  const cache = options.cache ?? new Map<string, ChessComCachedJsonResponse>();

  async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    let attempt = 0;
    while (true) {
      throwIfAborted(signal);
      const cached = cache.get(url);
      const cachedValue = cached?.value.deref();
      if (cached && !cachedValue) cache.delete(url);
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'User-Agent': userAgent,
      };
      if (cachedValue && cached?.etag) headers['If-None-Match'] = cached.etag;
      if (cachedValue && cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

      let response: Response;
      try {
        response = await fetchImpl(url, { headers, signal });
      } catch (error) {
        throwIfAborted(signal);
        if (attempt >= retries) throw error;
        await sleep(Math.min(retryBaseDelayMs * 2 ** attempt, maxRetryDelayMs), signal);
        attempt += 1;
        continue;
      }

      if (response.status === 304) {
        if (!cachedValue) throw new Error('Chess.com returned 304 without a cached response body.');
        return cachedValue as T;
      }

      if (response.ok) {
        const value = await response.json() as T;
        if (value !== null && typeof value === 'object') {
          cache.set(url, {
            etag: response.headers.get('etag'),
            lastModified: response.headers.get('last-modified'),
            value: new WeakRef(value),
          });
          trimCache(cache, cacheMaxEntries);
        }
        return value;
      }

      if (response.status === 429) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'), now());
        const delayMs = Math.max(rateLimitDelayMs, retryAfterMs ?? 0);
        throw new ChessComRateLimitError(new Date(now() + delayMs), response.statusText);
      }

      const error = new ChessComHttpError(response.status, response.statusText);
      if (!RETRYABLE_CHESS_COM_STATUSES.has(response.status) || attempt >= retries) {
        throw error;
      }
      const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'), now());
      await sleep(
        Math.min(retryAfterMs ?? retryBaseDelayMs * 2 ** attempt, maxRetryDelayMs),
        signal,
      );
      attempt += 1;
    }
  }

  return {
    fetchArchives(username, signal) {
      return requestJson<ChessComArchivesResponse>(buildChessComArchivesUrl(username), signal);
    },
    fetchMonthlyArchive(username, year, month, signal) {
      return requestJson<ChessComMonthlyGamesResponse>(
        buildChessComMonthlyArchiveUrl(username, year, month),
        signal,
      );
    },
  };
}

export const defaultChessComPubApiClient = createChessComPubApiClient();

function getPgnHeader(pgn: string | undefined, header: string): string | null {
  if (!pgn) return null;
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = pgn.match(new RegExp(`\\[${escaped}\\s+"([^"]*)"\\]`));
  return match?.[1] ?? null;
}

function parsePgnDateTime(dateValue: string | null, timeValue: string | null): Date | null {
  if (!dateValue || !/^\d{4}\.\d{2}\.\d{2}$/.test(dateValue)) return null;
  const datePart = dateValue.replace(/\./g, '-');
  const timePart = timeValue && /^\d{2}:\d{2}:\d{2}$/.test(timeValue) ? timeValue : '00:00:00';
  const parsed = new Date(`${datePart}T${timePart}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timestampSecondsToDate(value?: number): Date | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const parsed = new Date(value * 1000);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimeControlRaw(raw: string | null): ParsedTimeControl {
  if (!raw || raw === '-' || raw === '?') return { raw, initial: null, increment: null };
  const match = raw.match(/^(\d+)(?:\+(\d+))?$/);
  if (!match) return { raw, initial: null, increment: null };
  return {
    raw,
    initial: Number(match[1]),
    increment: match[2] ? Number(match[2]) : 0,
  };
}

function getTimeControl(game: ChessComGame): ParsedTimeControl {
  return parseTimeControlRaw(game.time_control ?? getPgnHeader(game.pgn, 'TimeControl'));
}

function parseRating(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeChessComName(value?: string | null): string | null {
  return value?.trim().toLowerCase() ?? null;
}

function getUserColor(game: ChessComGame, accountUsername: string): 'WHITE' | 'BLACK' | null {
  const account = normalizeChessComName(accountUsername);
  const white = normalizeChessComName(game.white?.username ?? getPgnHeader(game.pgn, 'White'));
  const black = normalizeChessComName(game.black?.username ?? getPgnHeader(game.pgn, 'Black'));
  if (account && white === account) return 'WHITE';
  if (account && black === account) return 'BLACK';
  return null;
}

function getResult(game: ChessComGame): string {
  const whiteResult = game.white?.result;
  const blackResult = game.black?.result;
  if (whiteResult === 'win') return '1-0';
  if (blackResult === 'win') return '0-1';
  if ((whiteResult && DRAW_RESULTS.has(whiteResult)) || (blackResult && DRAW_RESULTS.has(blackResult))) {
    return '1/2-1/2';
  }
  return getPgnHeader(game.pgn, 'Result') ?? '*';
}

function getResultForUser(
  game: ChessComGame,
  userColor: 'WHITE' | 'BLACK' | null,
): string | null {
  if (!userColor) return null;
  const ownResult = userColor === 'WHITE' ? game.white?.result : game.black?.result;
  if (!ownResult) return null;
  if (ownResult === 'win') return 'WIN';
  if (DRAW_RESULTS.has(ownResult)) return 'DRAW';
  return 'LOSS';
}

function getStatus(game: ChessComGame): string | null {
  const termination = getPgnHeader(game.pgn, 'Termination');
  if (termination) return termination;
  const whiteResult = game.white?.result;
  const blackResult = game.black?.result;
  return whiteResult || blackResult ? `${whiteResult ?? 'unknown'}/${blackResult ?? 'unknown'}` : null;
}

function getStartedAt(game: ChessComGame): Date | null {
  return timestampSecondsToDate(game.start_time)
    ?? parsePgnDateTime(getPgnHeader(game.pgn, 'UTCDate'), getPgnHeader(game.pgn, 'UTCTime'))
    ?? parsePgnDateTime(getPgnHeader(game.pgn, 'Date'), null);
}

function getEndedAt(game: ChessComGame): Date | null {
  return timestampSecondsToDate(game.end_time)
    ?? parsePgnDateTime(getPgnHeader(game.pgn, 'EndDate'), getPgnHeader(game.pgn, 'EndTime'))
    ?? getStartedAt(game);
}

function getProviderGameId(game: ChessComGame): string {
  const providerGameId = game.uuid
    ?? game.url
    ?? getPgnHeader(game.pgn, 'Link')
    ?? getPgnHeader(game.pgn, 'Site');
  if (!providerGameId) throw new Error('Chess.com game has no stable id or URL.');
  return providerGameId;
}

function assertValidRange(from: Date, to: Date): void {
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) {
    throw new Error('Chess.com import range must be a non-empty half-open interval.');
  }
}

function resolveNonNegativeInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 0) {
    throw new Error(`Chess.com ${name} must be a non-negative integer.`);
  }
  return resolved;
}

function resolvePositiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new Error(`Chess.com ${name} must be a positive integer.`);
  }
  return resolved;
}

function trimCache(
  cache: Map<string, ChessComCachedJsonResponse>,
  maxEntries: number,
): void {
  while (cache.size > maxEntries) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new Error('Chess.com request aborted.');
}

async function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      cleanup();
      reject(signal?.reason instanceof Error ? signal.reason : new Error('Chess.com retry aborted.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
  throwIfAborted(signal);
}
