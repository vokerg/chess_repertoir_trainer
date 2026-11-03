import { Chess, type Square } from 'chess.js';
import { z } from 'zod';
import type { CloudEvaluationResponse } from '@chess-trainer/contracts/lab';
import {
  normalizeFenForPosition,
  UCI_MOVE_RE,
  type StoredEngineLine,
} from 'chess-domain';

const lichessCloudPayloadSchema = z.object({
  depth: z.number().int().nonnegative(),
  knodes: z.number().int().nonnegative(),
  pvs: z.array(z.object({
    moves: z.string().min(4),
    cp: z.number().int().optional(),
    mate: z.number().int().optional(),
  })),
});

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export class LichessCloudEvaluationError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
  }
}

interface LichessCloudEvaluationOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  nowMs?: () => number;
}

const RATE_LIMIT_COOLDOWN_MS = 60_000;
const MAX_LINES = 3;

/** Accept full or four-field FEN, but send full validated FEN to Lichess. */
export function parseCloudEvaluationFen(input: string): { fen: string; normalizedFen: string } {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const fullFen = trimmed === 'startpos'
    ? new Chess().fen()
    : parts.length === 4 ? parts.join(' ') + ' 0 1' : trimmed;
  const fen = new Chess(fullFen).fen();
  return { fen, normalizedFen: normalizeFenForPosition(fen) };
}

/**
 * Cloud Eval uses UCI_Chess960 castling (king -> rook square).
 * Our chess-domain and browser caches use standard UCI (king -> destination).
 * Validate the entire PV against chess.js before accepting it.
 */
function legalStandardPv(fen: string, moves: string): string[] | null {
  const board = new Chess(fen);
  const tokens = moves.trim().split(/\s+/);
  const pv: string[] = [];

  for (const token of tokens) {
    const uci = token.toLowerCase();
    if (!UCI_MOVE_RE.test(uci)) return null;
    const from = uci.slice(0, 2);
    let to = uci.slice(2, 4);
    const piece = board.get(from as Square);
    if (piece?.type === 'k') {
      const castles: Record<string, string> = {
        e1h1: 'g1', e1a1: 'c1', e8h8: 'g8', e8a8: 'c8',
      };
      to = castles[uci] ?? to;
    }

    try {
      const move = board.move({ from, to, promotion: uci[4] });
      if (!move) return null;
      pv.push(move.from + move.to + (move.promotion ?? ''));
    } catch {
      return null;
    }
  }
  return pv.length ? pv : null;
}

export function createLichessCloudEvaluationClient(
  options: LichessCloudEvaluationOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const nowMs = options.nowMs ?? Date.now;
  let blockedUntilMs = 0;
  let pending: Promise<void> = Promise.resolve();

  // Serialise external requests for this API instance; don't fan out to Lichess.
  const serialized = <T>(job: () => Promise<T>): Promise<T> => {
    const task = pending.then(job, job);
    pending = task.then(() => undefined, () => undefined);
    return task;
  };

  return {
    fetchPosition(input: string): Promise<CloudEvaluationResponse> {
      const { fen, normalizedFen } = parseCloudEvaluationFen(input);
      return serialized<CloudEvaluationResponse>(async () => {
        if (nowMs() < blockedUntilMs) {
          throw new LichessCloudEvaluationError('Lichess Cloud Eval is temporarily rate limited.', 429);
        }

        const url = new URL('https://lichess.org/api/cloud-eval');
        url.searchParams.set('fen', fen);
        url.searchParams.set('multiPv', String(MAX_LINES));
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;
        try {
          response = await fetchImpl(url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new LichessCloudEvaluationError('Lichess Cloud Eval timed out.');
          }
          throw new LichessCloudEvaluationError('Could not reach Lichess Cloud Eval.');
        } finally {
          clearTimeout(timeout);
        }

        if (response.status === 404) {
          return { source: 'LICHESS_CLOUD', depth: null, knodes: null, positionAnalysis: null };
        }
        if (response.status === 429) {
          blockedUntilMs = nowMs() + RATE_LIMIT_COOLDOWN_MS;
          throw new LichessCloudEvaluationError('Lichess Cloud Eval is temporarily rate limited.', 429);
        }
        if (!response.ok) {
          throw new LichessCloudEvaluationError('Lichess Cloud Eval returned HTTP ' + response.status + '.', response.status);
        }

        let raw: unknown;
        try {
          raw = await response.json();
        } catch {
          throw new LichessCloudEvaluationError('Lichess Cloud Eval returned invalid JSON.');
        }
        const parsed = lichessCloudPayloadSchema.safeParse(raw);
        if (!parsed.success) {
          throw new LichessCloudEvaluationError('Lichess Cloud Eval returned an unexpected response.');
        }

        const lines: StoredEngineLine[] = [];
        for (const pv of parsed.data.pvs) {
          if (lines.length >= MAX_LINES) break;
          if ((pv.cp === undefined) === (pv.mate === undefined)) continue;
          if (pv.cp !== undefined && Math.abs(pv.cp) > 32767) continue;
          if (pv.mate !== undefined && Math.abs(pv.mate) > 32767) continue;
          const pvUci = legalStandardPv(fen, pv.moves);
          if (!pvUci) continue;
          lines.push({
            multipv: lines.length + 1,
            depth: parsed.data.depth,
            moveUci: pvUci[0],
            ...(pv.cp === undefined ? {} : { scoreCpWhite: pv.cp }),
            ...(pv.mate === undefined ? {} : { mateWhite: pv.mate }),
            pvUci,
          });
        }
        if (!lines.length) {
          throw new LichessCloudEvaluationError('Lichess Cloud Eval returned no valid engine lines.');
        }

        const best = lines[0];
        return {
          source: 'LICHESS_CLOUD',
          depth: parsed.data.depth,
          knodes: parsed.data.knodes,
          positionAnalysis: {
            fen,
            normalizedFen,
            bestMoveUci: best.moveUci!,
            bestScoreCpWhite: best.scoreCpWhite ?? null,
            bestMateWhite: best.mateWhite ?? null,
            lines,
            persistenceMode: 'rich',
          },
        };
      });
    },
  };
}

export const lichessCloudEvaluationClient = createLichessCloudEvaluationClient();
