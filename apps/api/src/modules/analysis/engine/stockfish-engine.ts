import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Interface, createInterface } from 'readline';
import { EngineLine, EngineSearchResult } from '../analysis.types';

const ENGINE_NAME = 'stockfish';

type PendingWait = {
  predicate: (message: string) => boolean;
  resolve: (message: string) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type ActiveSearch = {
  fen: string;
  depth: number;
  multipv: number;
  latestLines: Map<number, EngineLine>;
  bestMoveUci?: string;
  resolve: (result: EngineSearchResult) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

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

export class StockfishSession {
  private child: ChildProcessWithoutNullStreams;
  private rl: Interface;
  private stderr = '';
  private pendingWait: PendingWait | null = null;
  private activeSearch: ActiveSearch | null = null;
  private closed = false;
  private searchQueue: Promise<unknown> = Promise.resolve();

  private constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child;
    this.rl = createInterface({ input: child.stdout });

    child.stderr.on('data', (chunk) => {
      this.stderr += String(chunk);
    });

    child.on('error', (error) => {
      this.failCurrent(new Error(`Stockfish process error: ${error.message}`));
    });

    child.on('exit', (code) => {
      if (!this.closed) {
        this.failCurrent(new Error(`Stockfish exited with code ${code}${this.stderr ? `: ${this.stderr}` : ''}`));
      }
    });

    this.rl.on('line', (line) => this.handleLine(line));
  }

  static async start(): Promise<StockfishSession> {
    const enginePath = process.env['STOCKFISH_PATH'] || 'stockfish';
    const child = spawn(enginePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    const session = new StockfishSession(child);

    const initTimeoutMs = Number(process.env['ANALYSIS_ENGINE_INIT_TIMEOUT_MS'] || 10000);
    child.stdin.write('uci\n');
    await session.waitFor((message) => message === 'uciok', initTimeoutMs, `Stockfish did not finish UCI init within ${initTimeoutMs}ms`);

    const threads = Number(process.env['STOCKFISH_THREADS'] || 1);
    const hash = Number(process.env['STOCKFISH_HASH_MB'] || 16);
    if (Number.isFinite(threads) && threads > 0) child.stdin.write(`setoption name Threads value ${threads}\n`);
    if (Number.isFinite(hash) && hash > 0) child.stdin.write(`setoption name Hash value ${hash}\n`);
    child.stdin.write('isready\n');
    await session.waitFor((message) => message === 'readyok', initTimeoutMs, `Stockfish did not become ready within ${initTimeoutMs}ms`);

    child.stdin.write('ucinewgame\n');
    return session;
  }

  async search(options: StockfishSearchOptions): Promise<EngineSearchResult> {
    const run = () => this.runSearch(options);
    const queued = this.searchQueue.then(run, run);
    this.searchQueue = queued.catch(() => undefined);
    return queued;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.failCurrent(new Error('Stockfish session closed'));
    try {
      this.child.stdin.write('quit\n');
    } catch {
      // ignore stdin errors during shutdown
    }
    this.rl.close();
    this.child.kill();
  }

  private async runSearch(options: StockfishSearchOptions): Promise<EngineSearchResult> {
    if (this.closed) throw new Error('Stockfish session is closed');
    if (this.activeSearch) throw new Error('Stockfish search already in progress');

    const timeoutMs = options.timeoutMs ?? Number(process.env['ANALYSIS_TIMEOUT_MS'] || 15000);
    const depth = options.depth;
    const multipv = options.searchMoves?.length ? 1 : options.multipv;

    await this.setReadyOption(`setoption name MultiPV value ${multipv}`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const active = this.activeSearch;
        if (active) {
          this.activeSearch = null;
          active.reject(new Error(`Stockfish timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.activeSearch = {
        fen: options.fen,
        depth,
        multipv,
        latestLines: new Map<number, EngineLine>(),
        resolve,
        reject,
        timer,
      };

      const searchMoves = options.searchMoves?.length ? ` searchmoves ${options.searchMoves.join(' ')}` : '';
      this.child.stdin.write(`position fen ${options.fen}\n`);
      this.child.stdin.write(`go depth ${depth}${searchMoves}\n`);
    });
  }

  private async setReadyOption(command: string): Promise<void> {
    const timeoutMs = Number(process.env['ANALYSIS_ENGINE_READY_TIMEOUT_MS'] || 5000);
    this.child.stdin.write(`${command}\n`);
    this.child.stdin.write('isready\n');
    await this.waitFor((message) => message === 'readyok', timeoutMs, `Stockfish did not apply option within ${timeoutMs}ms`);
  }

  private waitFor(predicate: (message: string) => boolean, timeoutMs: number, timeoutMessage: string): Promise<string> {
    if (this.pendingWait) throw new Error('Stockfish wait already in progress');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingWait = null;
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      this.pendingWait = { predicate, resolve, reject, timer };
    });
  }

  private handleLine(line: string): void {
    const message = line.trim();
    if (!message) return;

    if (this.pendingWait?.predicate(message)) {
      const pending = this.pendingWait;
      this.pendingWait = null;
      clearTimeout(pending.timer);
      pending.resolve(message);
      return;
    }

    const search = this.activeSearch;
    if (!search) return;

    if (message.startsWith('info ')) {
      const parsed = parseInfoLine(search.fen, message);
      if (parsed) search.latestLines.set(parsed.multipv, parsed);
      return;
    }

    if (message.startsWith('bestmove ')) {
      const tokens = message.split(/\s+/);
      search.bestMoveUci = tokens[1] && tokens[1] !== '(none)' ? tokens[1] : undefined;
      this.activeSearch = null;
      clearTimeout(search.timer);
      search.resolve({
        fen: search.fen,
        depth: search.depth,
        multipv: search.multipv,
        bestMoveUci: search.bestMoveUci,
        lines: [...search.latestLines.values()].sort((a, b) => a.multipv - b.multipv),
      });
    }
  }

  private failCurrent(error: Error): void {
    if (this.pendingWait) {
      clearTimeout(this.pendingWait.timer);
      this.pendingWait.reject(error);
      this.pendingWait = null;
    }

    if (this.activeSearch) {
      clearTimeout(this.activeSearch.timer);
      this.activeSearch.reject(error);
      this.activeSearch = null;
    }
  }
}

export class StockfishEngine {
  static readonly engineName = ENGINE_NAME;

  static engineVersion(): string | undefined {
    return process.env['STOCKFISH_VERSION'];
  }

  static async search(options: StockfishSearchOptions): Promise<EngineSearchResult> {
    const session = await StockfishSession.start();
    try {
      return await session.search(options);
    } finally {
      session.close();
    }
  }
}
