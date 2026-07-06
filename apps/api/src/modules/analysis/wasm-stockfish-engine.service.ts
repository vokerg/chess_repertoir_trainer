import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { parseUciInfoLine, stockfishActiveColorFromFen, storedEngineLineFromUciInfo } from 'chess-domain';
import { StorePositionAnalysisInput, StoredEngineLine } from './analysis.types';
import { EngineAnalyzeOptions, StockfishEngine } from './stockfish-engine';

interface PendingLineWaiter {
  test: (line: string) => boolean;
  resolve: () => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface ActiveAnalysis {
  fen: string;
  activeColor: 'w' | 'b';
  multipv: number;
  lines: Map<number, StoredEngineLine>;
  resolve: (value: StorePositionAnalysisInput) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface WasmStockfishEngineOptions {
  timeoutMs: number;
}

const MISSING_STOCKFISH_PACKAGE_ERROR = 'WASM Stockfish engine is not installed. Add stockfish to apps/api dependencies or use STOCKFISH_ENGINE=local.';

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'line'; line: string }
  | { type: 'error'; error: string };

export class WasmStockfishEngineService implements StockfishEngine {
  private worker: Worker | null = null;
  private waiters: PendingLineWaiter[] = [];
  private activeAnalysis: ActiveAnalysis | null = null;
  private startupWaiter: { resolve: () => void; reject: (err: Error) => void; timer: NodeJS.Timeout } | null = null;

  constructor(private readonly options: WasmStockfishEngineOptions) {}

  async init(): Promise<void> {
    if (this.worker) return;

    const worker = new Worker(join(__dirname, 'wasm-stockfish-worker.js'));
    this.worker = worker;
    worker.on('message', (message: WorkerMessage) => this.handleWorkerMessage(message));
    worker.on('error', (err) => {
      if (this.worker === worker) this.worker = null;
      this.rejectStartup(err);
      this.rejectAll(err);
    });
    worker.on('exit', (code) => {
      const err = new Error(`WASM Stockfish worker exited with code ${code}`);
      if (this.worker === worker) this.worker = null;
      this.rejectStartup(err);
      this.rejectAll(err);
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.startupWaiter = null;
        reject(new Error(`WASM Stockfish worker did not start within ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);
      this.startupWaiter = { resolve, reject, timer };
    });

    this.send('uci');
    await this.waitForLine((line) => line === 'uciok');
    this.send('setoption name UCI_AnalyseMode value true');
    this.send('setoption name Threads value 1');
    this.send('setoption name Hash value 64');
    await this.ready();
  }

  async analyzePosition(fen: string, options: EngineAnalyzeOptions): Promise<StorePositionAnalysisInput> {
    await this.init();
    if (this.activeAnalysis) {
      throw new Error('WASM Stockfish analysis is already running');
    }

    const activeColor = stockfishActiveColorFromFen(fen);
    const multipv = Math.max(1, Math.min(3, options.multipv || 1));
    this.send(`setoption name MultiPV value ${multipv}`);
    await this.ready();

    return new Promise<StorePositionAnalysisInput>((resolve, reject) => {
      const timer = setTimeout(() => {
        const err = new Error(`WASM Stockfish analysis timed out after ${this.options.timeoutMs}ms`);
        this.activeAnalysis = null;
        reject(err);
      }, this.options.timeoutMs);

      this.activeAnalysis = {
        fen,
        activeColor,
        multipv,
        lines: new Map<number, StoredEngineLine>(),
        resolve,
        reject,
        timer,
      };

      this.send(`position fen ${toEngineFen(fen)}`);
      this.send(`go depth ${Math.max(1, options.depth)}`);
    });
  }

  dispose(): void {
    const worker = this.worker;
    this.worker = null;
    this.rejectStartup(new Error('WASM Stockfish disposed'));
    this.rejectAll(new Error('WASM Stockfish disposed'));
    if (worker) {
      worker.postMessage({ type: 'command', command: 'quit' });
      void worker.terminate();
    }
  }

  private ready(): Promise<void> {
    this.send('isready');
    return this.waitForLine((line) => line === 'readyok');
  }

  private waitForLine(test: (line: string) => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((waiter) => waiter.timer !== timer);
        reject(new Error('Timed out waiting for WASM Stockfish response'));
      }, this.options.timeoutMs);

      this.waiters.push({ test, resolve, reject, timer });
    });
  }

  private send(command: string): void {
    if (!this.worker) {
      throw new Error('WASM Stockfish worker is not running');
    }
    this.worker.postMessage({ type: 'command', command });
  }

  private handleWorkerMessage(message: WorkerMessage): void {
    if (message.type === 'ready') {
      if (this.startupWaiter) {
        clearTimeout(this.startupWaiter.timer);
        this.startupWaiter.resolve();
        this.startupWaiter = null;
      }
      return;
    }

    if (message.type === 'error') {
      const err = new Error(normalizeWorkerErrorMessage(message.error));
      this.stopWorker();
      this.rejectStartup(err);
      this.rejectAll(err);
      return;
    }

    this.handleLine(message.line.trim());
  }

  private stopWorker(): void {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.removeAllListeners();
      void worker.terminate();
    }
  }

  private handleLine(line: string): void {
    if (!line) return;

    for (const waiter of [...this.waiters]) {
      if (waiter.test(line)) {
        clearTimeout(waiter.timer);
        this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
        waiter.resolve();
      }
    }

    if (line.startsWith('info ')) {
      this.captureInfoLine(line);
      return;
    }

    if (line.startsWith('bestmove ')) {
      this.finishAnalysis(line);
    }
  }

  private captureInfoLine(line: string): void {
    const active = this.activeAnalysis;
    if (!active) return;

    const parsed = parseUciInfoLine(line);
    if (!parsed) return;

    const multipv = parsed.multipv ?? 1;
    const existing = active.lines.get(multipv);
    const storedLine = storedEngineLineFromUciInfo(parsed, active.activeColor);
    if (!existing || (storedLine.depth ?? 0) >= (existing.depth ?? 0)) {
      active.lines.set(multipv, storedLine);
    }
  }

  private finishAnalysis(bestMoveLine: string): void {
    const active = this.activeAnalysis;
    if (!active) return;

    clearTimeout(active.timer);
    this.activeAnalysis = null;

    const bestMove = bestMoveLine.split(/\s+/)[1];
    const lines = Array.from(active.lines.entries())
      .sort(([left], [right]) => left - right)
      .map(([, value]) => value)
      .slice(0, active.multipv);

    if (!lines.length && bestMove && bestMove !== '(none)') {
      lines.push({ multipv: 1, pvUci: [bestMove], moveUci: bestMove });
    }

    const bestLine = lines[0];
    active.resolve({
      fen: active.fen,
      bestMoveUci: bestLine?.moveUci ?? (bestMove !== '(none)' ? bestMove : undefined),
      bestScoreCpWhite: bestLine?.scoreCpWhite,
      bestMateWhite: bestLine?.mateWhite,
      lines,
    });
  }

  private rejectStartup(err: Error): void {
    if (!this.startupWaiter) return;
    clearTimeout(this.startupWaiter.timer);
    this.startupWaiter.reject(err);
    this.startupWaiter = null;
  }

  private rejectAll(err: Error): void {
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(err);
    }
    this.waiters = [];

    if (this.activeAnalysis) {
      clearTimeout(this.activeAnalysis.timer);
      this.activeAnalysis.reject(err);
      this.activeAnalysis = null;
    }
  }
}

function normalizeWorkerErrorMessage(message: string): string {
  return message.includes("Cannot find module 'stockfish'")
    ? MISSING_STOCKFISH_PACKAGE_ERROR
    : message;
}

function toEngineFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.length >= 6 ? fen : `${parts.slice(0, 4).join(' ')} 0 1`;
}
