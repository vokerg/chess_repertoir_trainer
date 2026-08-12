import type {
  AccountImportMode,
  AccountImportScope,
} from '@chess-trainer/contracts';
import {
  isStandardImportedGameVariant,
  normalizeImportedGameVariant,
  normalizeSpeedCategory,
} from '../../../imported-games/imported-game-workflow-eligibility';
import type {
  NormalizedAccountImportGame,
  StoredAccountImportCoverage,
} from '../../account-import.types';

export const LICHESS_GAMES_URL = 'https://lichess.org/api/games/user';
const DAY_MS = 24 * 60 * 60_000;

export interface LichessImportWindow {
  from: Date;
  to: Date;
}

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
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
  players: {
    white?: LichessPlayer;
    black?: LichessPlayer;
  };
  opening?: {
    eco?: string;
    name?: string;
    ply?: number;
  };
}

export interface LichessPlayer {
  user?: {
    id?: string;
    name?: string;
    title?: string;
  };
  rating?: number;
  ratingDiff?: number;
  aiLevel?: number;
}

interface ParsedTimeControl {
  raw: string | null;
  initial: number | null;
  increment: number | null;
}

export interface LichessNdjsonTimingHooks {
  now?: () => number;
  onProviderWaitMs?: (durationMs: number) => void;
  onParseMs?: (durationMs: number) => void;
}

const PERF_TYPE_BY_SPEED: Record<AccountImportScope['speeds'][number], string> = {
  BULLET: 'bullet',
  BLITZ: 'blitz',
  RAPID: 'rapid',
};

export function mapAccountImportSpeedsToLichessPerfTypes(
  speeds: AccountImportScope['speeds'],
): string[] {
  return speeds.map((speed) => PERF_TYPE_BY_SPEED[speed]);
}

export function planLichessImportWindows(input: {
  requestedFrom: Date;
  requestedTo: Date;
  mode: Exclude<AccountImportMode, 'LEGACY_SYNC'>;
  windowDays: number;
}): LichessImportWindow[] {
  validateRange(input.requestedFrom, input.requestedTo);
  if (!Number.isSafeInteger(input.windowDays) || input.windowDays <= 0) {
    throw new Error('Lichess import windowDays must be a positive integer.');
  }

  const windowMs = input.windowDays * DAY_MS;
  const windows: LichessImportWindow[] = [];

  if (input.mode === 'INCREMENTAL_FORWARD') {
    let from = input.requestedFrom.getTime();
    const requestedTo = input.requestedTo.getTime();
    while (from < requestedTo) {
      const to = Math.min(requestedTo, from + windowMs);
      windows.push({ from: new Date(from), to: new Date(to) });
      from = to;
    }
    return windows;
  }

  let to = input.requestedTo.getTime();
  const requestedFrom = input.requestedFrom.getTime();
  while (to > requestedFrom) {
    const from = Math.max(requestedFrom, to - windowMs);
    windows.push({ from: new Date(from), to: new Date(to) });
    to = from;
  }
  return windows;
}

export function isLichessImportWindowCovered(
  window: LichessImportWindow,
  coverage: StoredAccountImportCoverage | null,
): boolean {
  if (!coverage?.coveredFrom || !coverage.coveredThrough) return false;
  return coverage.coveredFrom <= window.from && coverage.coveredThrough >= window.to;
}

export function canExtendCoverageWithLichessWindow(
  window: LichessImportWindow,
  coverage: StoredAccountImportCoverage | null,
): boolean {
  if (!coverage?.coveredFrom || !coverage.coveredThrough) return true;
  return window.to >= coverage.coveredFrom && window.from <= coverage.coveredThrough;
}

export function buildLichessGamesRequestUrl(input: {
  username: string;
  window: LichessImportWindow;
  scope: AccountImportScope;
  mode: Exclude<AccountImportMode, 'LEGACY_SYNC'>;
  baseUrl?: string;
}): URL {
  validateRange(input.window.from, input.window.to);
  const baseUrl = input.baseUrl ?? LICHESS_GAMES_URL;
  const url = new URL(`${baseUrl}/${encodeURIComponent(input.username)}`);
  url.searchParams.set('since', String(input.window.from.getTime()));
  url.searchParams.set('until', String(input.window.to.getTime() - 1));
  url.searchParams.set('perfType', mapAccountImportSpeedsToLichessPerfTypes(input.scope.speeds).join(','));
  url.searchParams.set('finished', 'true');
  url.searchParams.set('sort', input.mode === 'INCREMENTAL_FORWARD' ? 'dateAsc' : 'dateDesc');
  url.searchParams.set('pgnInJson', 'true');
  url.searchParams.set('opening', 'true');

  if (input.scope.rated === 'RATED') url.searchParams.set('rated', 'true');
  if (input.scope.rated === 'UNRATED') url.searchParams.set('rated', 'false');
  return url;
}

export function matchesLichessImportScope(
  game: LichessGame,
  scope: AccountImportScope,
): boolean {
  if (!isStandardImportedGameVariant(game.variant)) return false;
  const speed = normalizeSpeedCategory(game.speed ?? game.perf);
  if (!speed) return false;
  const acceptedSpeeds = new Set(mapAccountImportSpeedsToLichessPerfTypes(scope.speeds));
  if (!acceptedSpeeds.has(speed)) return false;
  if (scope.rated === 'RATED' && !game.rated) return false;
  if (scope.rated === 'UNRATED' && game.rated) return false;
  return true;
}

export function normalizeLichessGame(
  game: LichessGame,
  accountUsername: string,
): NormalizedAccountImportGame {
  const timeControl = getTimeControl(game);
  const userColor = getUserColor(game, accountUsername);
  const whiteUsername = playerName(game.players.white) ?? getPgnHeader(game.pgn, 'White');
  const blackUsername = playerName(game.players.black) ?? getPgnHeader(game.pgn, 'Black');
  const opponentUsername = userColor === 'WHITE'
    ? blackUsername
    : userColor === 'BLACK'
      ? whiteUsername
      : null;

  return {
    providerGameId: game.id,
    providerUrl: game.url ?? getPgnHeader(game.pgn, 'Site') ?? buildLichessGameUrl(game.id),
    pgn: game.pgn ?? null,
    rated: game.rated,
    variant: normalizeImportedGameVariant(game.variant ?? getPgnHeader(game.pgn, 'Variant')),
    speedCategory: game.speed ?? game.perf ?? null,
    timeControlRaw: timeControl.raw,
    timeControlInitial: timeControl.initial,
    timeControlIncrement: timeControl.increment,
    startedAt: toDate(game.createdAt),
    endedAt: toDate(game.lastMoveAt ?? game.createdAt),
    whiteUsername,
    blackUsername,
    whiteRating: game.players.white?.rating ?? parseRating(getPgnHeader(game.pgn, 'WhiteElo')),
    blackRating: game.players.black?.rating ?? parseRating(getPgnHeader(game.pgn, 'BlackElo')),
    userColor,
    opponentUsername,
    result: getResult(game),
    resultForUser: getLichessResultForUser(game, userColor),
    status: game.status ?? getPgnHeader(game.pgn, 'Termination'),
    openingName: game.opening?.name ?? getPgnHeader(game.pgn, 'Opening'),
    openingEco: game.opening?.eco ?? getPgnHeader(game.pgn, 'ECO'),
  };
}

export function getLichessResultForUser(
  game: { status?: string; winner?: 'white' | 'black'; pgn?: string },
  userColor: 'WHITE' | 'BLACK' | null,
): 'WIN' | 'LOSS' | 'DRAW' | null {
  if (!userColor) return null;
  if (game.status === 'draw' || game.status === 'stalemate') return 'DRAW';
  if (getPgnHeader(game.pgn, 'Result') === '1/2-1/2') return 'DRAW';
  if (!game.winner) return null;
  return game.winner.toUpperCase() === userColor ? 'WIN' : 'LOSS';
}

export async function* readLichessNdjson(
  response: Response,
  signal?: AbortSignal,
  timing: LichessNdjsonTimingHooks = {},
): AsyncGenerator<LichessGame> {
  if (!response.body) return;
  throwIfAborted(signal);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const now = timing.now ?? Date.now;
  let buffer = '';
  let completed = false;
  const abortReader = () => {
    void reader.cancel(signal?.reason).catch(() => undefined);
  };
  signal?.addEventListener('abort', abortReader, { once: true });

  try {
    while (true) {
      throwIfAborted(signal);
      const readStartedAt = now();
      const { done, value } = await reader.read();
      timing.onProviderWaitMs?.(Math.max(0, now() - readStartedAt));
      throwIfAborted(signal);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        yield parseTimedLine(trimmed, now, timing.onParseMs);
      }
    }

    buffer += decoder.decode();
    const trimmed = buffer.trim();
    if (trimmed) yield parseTimedLine(trimmed, now, timing.onParseMs);
    completed = true;
  } finally {
    signal?.removeEventListener('abort', abortReader);
    if (!completed) await reader.cancel(signal?.reason).catch(() => undefined);
    reader.releaseLock();
  }
}

function parseTimedLine(
  line: string,
  now: () => number,
  onParseMs?: (durationMs: number) => void,
): LichessGame {
  const startedAt = now();
  try {
    return parseLichessGame(JSON.parse(line));
  } catch (error) {
    if (error instanceof LichessNdjsonRecordError) throw error;
    throw new LichessNdjsonRecordError();
  } finally {
    onParseMs?.(Math.max(0, now() - startedAt));
  }
}

export class LichessNdjsonRecordError extends Error {
  constructor() {
    super('Lichess returned a malformed game record.');
    this.name = 'LichessNdjsonRecordError';
  }
}

function parseLichessGame(value: unknown): LichessGame {
  if (!isRecord(value)) throw new LichessNdjsonRecordError();
  const id = requiredString(value['id']);
  const rated = requiredBoolean(value['rated']);
  const variant = requiredString(value['variant']);
  const speed = requiredString(value['speed']);
  const perf = requiredString(value['perf']);
  const createdAt = requiredNumber(value['createdAt']);
  const lastMoveAt = requiredNumber(value['lastMoveAt']);
  const status = requiredString(value['status']);
  if (!isRecord(value['players'])) throw new LichessNdjsonRecordError();

  return {
    ...(value as unknown as LichessGame),
    id,
    rated,
    variant,
    speed,
    perf,
    createdAt,
    lastMoveAt,
    status,
    players: value['players'] as LichessGame['players'],
  };
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new LichessNdjsonRecordError();
  return value;
}

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new LichessNdjsonRecordError();
  return value;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new LichessNdjsonRecordError();
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDate(value?: number): Date | null {
  return typeof value === 'number' ? new Date(value) : null;
}

function playerName(player?: LichessPlayer): string | null {
  return player?.user?.name ?? (player?.aiLevel ? `Stockfish level ${player.aiLevel}` : null);
}

function normalizeLichessName(value?: string | null): string | null {
  return value?.trim().toLowerCase() ?? null;
}

function getPgnHeader(pgn: string | undefined, header: string): string | null {
  if (!pgn) return null;
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = pgn.match(new RegExp(`\\[${escaped}\\s+"([^"]*)"\\]`));
  return match?.[1] ?? null;
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
  const white = normalizeLichessName(playerName(game.players.white) ?? getPgnHeader(game.pgn, 'White'));
  const black = normalizeLichessName(playerName(game.players.black) ?? getPgnHeader(game.pgn, 'Black'));
  if (account && white === account) return 'WHITE';
  if (account && black === account) return 'BLACK';
  return null;
}

function getResult(game: LichessGame): string {
  if (game.winner === 'white') return '1-0';
  if (game.winner === 'black') return '0-1';
  if (game.status === 'draw' || game.status === 'stalemate') return '1/2-1/2';
  return getPgnHeader(game.pgn, 'Result') ?? '*';
}

function buildLichessGameUrl(gameId: string): string {
  return `https://lichess.org/${gameId}`;
}

function parseRating(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Lichess account import was aborted.');
}

function validateRange(from: Date, to: Date): void {
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) {
    throw new Error('Lichess import window must be a non-empty valid range.');
  }
}
