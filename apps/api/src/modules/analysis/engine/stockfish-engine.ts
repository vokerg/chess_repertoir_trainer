import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { EngineLine, EngineSearchResult } from '../analysis.types';

const ENGINE_NAME = 'stockfish';

function getFenTurn(fen: string): 'w' | 'b' {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}

function scoreToWhitePerspective(fen: string, score: number): number {
  return getFenTurn(fen) === 'w' ? score : -score;
}

function parseInfoLine(fen: string, message: string): EngineLine | null {
  const tokens = message.trim().split(/\s+/);
  const depthIndex = tokens.indexOf('depth');
  const scoreIndex = tokens.indexOf('score');
  const pvIndex = tokens.indexOf('pv');

  if (depthIndex < 0 || scoreIndex < 0 || pvIndex < 0) return null;

  const depth = Number(tokens[depthIndex + 1]);
  if (!Number.isFinite(depth)) return null;

  const multipvIndex = tokens.indexOf('multipv');
  const multipv = multipvIndex >= 0 ? Number(tokens[multipvIndex + 1]) || 1 : 1;
  const scoreKind = tokens[scoreIndex + 1];
  const scoreValue = Number(tokens[scoreIndex + 2]);
  const pvUci = tokens.slice(pvIndex + 1).filter(Boolean);

  if (!Number.isFinite(scoreValue) || pvUci.length === 0) return null;

  const line: EngineLine = {
    multipv,
    depth,
    moveUci: pvUci[0],
    pvUci,
  };

  if (scoreKind === 'cp') {
    line.scoreCpWhite = scoreToWhitePerspective(fen, scoreValue);
  } else if (scoreKind === 'mate') {
    line.mateWhite = scoreToWhitePerspective(fen, scoreValue);
  } else {
    return null;
  }

  return line;
}

export interface StockfishSearchOptions {
  fen: string;
  depth: number;
  multipv: number;
  searchMoves?: string[];
  timeoutMs?: number;
}

export class StockfishEngine {
  static readonly engineName = ENGINE_NAME;

  static engineVersion(): string | undefined {
    return process.env['STOCKFISH_VERSION'];
  }

  static async search(options: StockfishSearchOptions): Promise<EngineSearchResult> {
    const enginePath = process.env['STOCKFISH_PATH'] || 'stockfish';
    const timeoutMs = options.timeoutMs ?? Number(process.env['ANALYSIS_TIMEOUT_MS'] || 15000);
    const depth = options.depth;
    const multipv = options.searchMoves?.length ? 1 : options.multipv;
    const latestLines = new Map<number, EngineLine>();

    return new Promise((resolve, reject) => {
      const child = spawn(enginePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
      let settled = false;
      let bestMoveUci: string | undefined;
      let stderr = '';
      let discoveredVersion = process.env['STOCKFISH_VERSION'];

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          child.stdin.write('quit\n');
        } catch {
          // ignore stdin errors during shutdown
        }
        child.kill();

        if (err) {
          reject(err);
          return;
        }

        resolve({
          fen: options.fen,
          depth,
          multipv,
          bestMoveUci,
          lines: [...latestLines.values()].sort((a, b) => a.multipv - b.multipv),
        });
      };

      const timer = setTimeout(() => {
        finish(new Error(`Stockfish timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on('error', (error) => {
        finish(new Error(`Could not start Stockfish at ${enginePath}: ${error.message}`));
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('exit', (code) => {
        if (!settled && code !== 0) {
          finish(new Error(`Stockfish exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
        }
      });

      const rl = createInterface({ input: child.stdout });
      rl.on('line', (line) => {
        const message = line.trim();
        if (!message) return;

        if (!discoveredVersion && /stockfish/i.test(message)) {
          discoveredVersion = message;
        }

        if (message === 'uciok') {
          const threads = Number(process.env['STOCKFISH_THREADS'] || 1);
          const hash = Number(process.env['STOCKFISH_HASH_MB'] || 64);
          if (Number.isFinite(threads) && threads > 0) child.stdin.write(`setoption name Threads value ${threads}\n`);
          if (Number.isFinite(hash) && hash > 0) child.stdin.write(`setoption name Hash value ${hash}\n`);
          child.stdin.write(`setoption name MultiPV value ${multipv}\n`);
          child.stdin.write('isready\n');
          return;
        }

        if (message === 'readyok') {
          const searchMoves = options.searchMoves?.length ? ` searchmoves ${options.searchMoves.join(' ')}` : '';
          child.stdin.write('ucinewgame\n');
          child.stdin.write(`position fen ${options.fen}\n`);
          child.stdin.write(`go depth ${depth}${searchMoves}\n`);
          return;
        }

        if (message.startsWith('info ')) {
          const parsed = parseInfoLine(options.fen, message);
          if (parsed) latestLines.set(parsed.multipv, parsed);
          return;
        }

        if (message.startsWith('bestmove ')) {
          const tokens = message.split(/\s+/);
          bestMoveUci = tokens[1] && tokens[1] !== '(none)' ? tokens[1] : undefined;
          if (!process.env['STOCKFISH_VERSION'] && discoveredVersion) {
            process.env['STOCKFISH_VERSION'] = discoveredVersion;
          }
          finish();
        }
      });

      child.stdin.write('uci\n');
    });
  }
}
